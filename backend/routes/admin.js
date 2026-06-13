const express = require('express');
const User = require('../models/User');
const Event = require('../models/Event');
const Application = require('../models/Application');
const DeliverableSubmission = require('../models/DeliverableSubmission');
const SystemSettings = require('../models/SystemSettings');
const { protect, requireAdmin } = require('../middleware/auth');
const { createNotification } = require('../utils/notifications');
const { getStripe, isStripeConfigured } = require('../utils/stripe');
const { BUSINESS_PLANS } = require('../utils/businessPlans');
const {
  sendInfluencerValidatedEmail,
  sendInfluencerRejectedEmail,
  sendBusinessValidatedEmail,
  sendBusinessRejectedEmail,
} = require('../utils/mailer');

const router = express.Router();

function pushSubscriptionHistory(user, entry = {}) {
  user.subscriptionHistory = Array.isArray(user.subscriptionHistory) ? user.subscriptionHistory : [];
  user.subscriptionHistory.unshift({
    action: entry.action || 'manual_update',
    source: entry.source || 'system',
    plan: entry.plan || user.subscriptionPlan,
    status: entry.status || user.subscriptionStatus,
    productId: entry.productId !== undefined ? entry.productId : user.subscriptionProductId,
    store: entry.store !== undefined ? entry.store : user.subscriptionStore,
    expiresAt: entry.expiresAt !== undefined ? entry.expiresAt : user.subscriptionExpiresAt,
    note: entry.note || '',
    actorId: entry.actorId,
    actorName: entry.actorName,
    createdAt: entry.createdAt || new Date(),
  });
  user.subscriptionHistory = user.subscriptionHistory.slice(0, 50);
}

// ─── Utilisateurs ──────────────────────────────────────────────────────────────

// GET /admin/users — tous les utilisateurs
router.get('/users', protect, requireAdmin, async (req, res) => {
  try {
    const { status, type, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(filter),
    ]);
    res.json({ users, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/users/:id', protect, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /admin/subscriptions — vue abonnements business
router.get('/subscriptions', protect, requireAdmin, async (req, res) => {
  try {
    const { plan, status, search, foundingPartner } = req.query;
    const filter = { type: 'business' };
    if (plan) filter.subscriptionPlan = plan;
    if (status) filter.subscriptionStatus = status;
    if (foundingPartner === 'true') filter.isFoundingPartner = true;
    if (foundingPartner === 'false') filter.isFoundingPartner = false;
    if (search) {
      const searchRegex = new RegExp(String(search), 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { businessName: searchRegex },
        { businessCity: searchRegex },
      ];
    }

    const businesses = await User.find(filter)
      .select('name email businessName businessCity subscriptionPlan subscriptionStatus subscriptionProductId subscriptionStore subscriptionExpiresAt subscriptionUpdatedAt stripeCustomerId stripeSubscriptionId revenueCatCustomerId createdAt status isFoundingPartner foundingPartnerGrantedAt')
      .sort({ subscriptionUpdatedAt: -1, createdAt: -1 });

    // Métriques globales (indépendantes des filtres de recherche) : MRR, actifs, par pack
    const allBusiness = await User.find({ type: 'business' })
      .select('subscriptionPlan subscriptionStatus subscriptionStore isFoundingPartner')
      .lean();

    const metrics = {
      mrr: 0,
      activeCount: 0,
      trialingCount: 0,
      pastDueCount: 0,
      cancelledCount: 0,
      inactiveCount: 0,
      graceCount: 0,
      foundingPartners: 0,
      stripeCount: 0,
      byPlan: { starter: 0, pro: 0, group: 0 },
    };

    for (const b of allBusiness) {
      if (b.isFoundingPartner) metrics.foundingPartners += 1;
      if (b.subscriptionStore === 'stripe') metrics.stripeCount += 1;
      const status = b.subscriptionStatus || 'inactive';
      const plan = b.subscriptionPlan || 'starter';
      if (status === 'active') metrics.activeCount += 1;
      else if (status === 'trialing') metrics.trialingCount += 1;
      else if (status === 'past_due') metrics.pastDueCount += 1;
      else if (status === 'cancelled') metrics.cancelledCount += 1;
      else if (status === 'grace') metrics.graceCount += 1;
      else metrics.inactiveCount += 1;

      // MRR = revenu récurrent des abonnements actifs ou en essai
      if (['active', 'trialing'].includes(status)) {
        if (metrics.byPlan[plan] !== undefined) metrics.byPlan[plan] += 1;
        metrics.mrr += BUSINESS_PLANS[plan]?.priceMonthly || 0;
      }
    }

    res.json({ subscriptions: businesses, metrics });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/subscriptions/:id', protect, requireAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, type: 'business' })
      .select('name email phone status createdAt businessName businessType businessCity businessAddress businessDescription businessLogo isFoundingPartner foundingPartnerGrantedAt subscriptionPlan subscriptionStatus subscriptionProductId subscriptionStore subscriptionExpiresAt subscriptionUpdatedAt subscriptionHistory stripeCustomerId stripeSubscriptionId revenueCatCustomerId');

    if (!user) {
      return res.status(404).json({ message: 'Abonnement introuvable' });
    }

    const eventIds = await Event.find({ creator: user._id, isActive: true }).distinct('_id');
    const activeEvents = eventIds.length;
    const pendingApplications = await Application.countDocuments({
      event: { $in: eventIds },
      status: 'pending',
    });

    // Données Stripe live (lecture seule) si un client/abonnement Stripe est rattaché
    let stripe = null;
    if (isStripeConfigured() && user.stripeCustomerId) {
      const isTestMode = (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_test');
      const dashboardBase = `https://dashboard.stripe.com/${isTestMode ? 'test/' : ''}`;
      stripe = {
        configured: true,
        testMode: isTestMode,
        customerId: user.stripeCustomerId,
        subscriptionId: user.stripeSubscriptionId || null,
        customerUrl: `${dashboardBase}customers/${user.stripeCustomerId}`,
        subscriptionUrl: user.stripeSubscriptionId ? `${dashboardBase}subscriptions/${user.stripeSubscriptionId}` : null,
      };
      try {
        if (user.stripeSubscriptionId) {
          const sub = await getStripe().subscriptions.retrieve(user.stripeSubscriptionId, {
            expand: ['default_payment_method'],
          });
          const item = sub.items?.data?.[0];
          const pm = sub.default_payment_method;
          stripe.status = sub.status;
          stripe.cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);
          stripe.currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;
          stripe.amount = item?.price?.unit_amount != null ? item.price.unit_amount / 100 : null;
          stripe.currency = (item?.price?.currency || 'eur').toUpperCase();
          stripe.interval = item?.price?.recurring?.interval || null;
          stripe.priceId = item?.price?.id || null;
          stripe.paymentMethod = pm && pm.card ? { brand: pm.card.brand, last4: pm.card.last4 } : null;
        }
      } catch (stripeErr) {
        stripe.error = stripeErr.message;
      }
    }

    res.json({
      subscription: user,
      stripe,
      metrics: {
        activeEvents,
        pendingApplications,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /admin/users/:id/status — valider ou rejeter un utilisateur
router.put('/users/:id/status', protect, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['validated', 'rejected', 'pending'].includes(status))
      return res.status(400).json({ message: 'Statut invalide' });

    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

    if (status === 'validated' || status === 'rejected') {
      // Notification in-app
      await createNotification({
        userId: user._id,
        actorId: req.user._id,
        type: status === 'validated' ? 'account_validated' : 'account_rejected',
        category: 'profile',
        title: status === 'validated' ? 'Compte validé' : 'Compte refusé',
        body: status === 'validated'
          ? 'Votre compte ONLIST est désormais actif.'
          : 'Votre compte ONLIST a été refusé. Contactez le support pour plus d\'informations.',
        entityType: 'profile',
        entityId: user._id,
        data: { status },
      });

      // Email automatique selon le type et le statut
      if (user.email) {
        try {
          if (user.type === 'influencer' && status === 'validated') {
            await sendInfluencerValidatedEmail({ to: user.email, name: user.name });
          } else if (user.type === 'influencer' && status === 'rejected') {
            await sendInfluencerRejectedEmail({ to: user.email, name: user.name });
          } else if (user.type === 'business' && status === 'validated') {
            await sendBusinessValidatedEmail({ to: user.email, businessName: user.businessName || user.name });
          } else if (user.type === 'business' && status === 'rejected') {
            await sendBusinessRejectedEmail({ to: user.email, businessName: user.businessName || user.name });
          }
        } catch (mailErr) {
          // On log l'erreur mail mais on ne bloque pas la réponse
          console.error('Email de statut non envoyé:', mailErr.message);
        }
      }
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/users/:id/founding-partner', protect, requireAdmin, async (req, res) => {
  try {
    const { isFoundingPartner } = req.body;
    const user = await User.findById(req.params.id);
    if (!user || user.type !== 'business') {
      return res.status(404).json({ message: 'Business introuvable' });
    }

    user.isFoundingPartner = Boolean(isFoundingPartner);
    user.foundingPartnerGrantedAt = user.isFoundingPartner ? new Date() : null;
    if (user.isFoundingPartner && user.subscriptionStatus !== 'active') {
      user.subscriptionStatus = 'grace';
    } else if (!user.isFoundingPartner && user.subscriptionStatus === 'grace') {
      user.subscriptionStatus = 'inactive';
    }
    user.subscriptionUpdatedAt = new Date();
    pushSubscriptionHistory(user, {
      action: user.isFoundingPartner ? 'founding_partner_granted' : 'founding_partner_revoked',
      source: 'admin',
      actorId: req.user?._id,
      actorName: req.user?.name || req.user?.email || 'Admin',
      note: user.isFoundingPartner ? 'Founding Partner accordé depuis le dashboard admin' : 'Founding Partner retiré depuis le dashboard admin',
    });
    await user.save();

    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/users/:id/subscription', protect, requireAdmin, async (req, res) => {
  try {
    const { subscriptionPlan, subscriptionStatus, subscriptionExpiresAt, subscriptionProductId, subscriptionStore, note } = req.body;
    const user = await User.findById(req.params.id);
    if (!user || user.type !== 'business') {
      return res.status(404).json({ message: 'Business introuvable' });
    }

    const allowedPlans = ['starter', 'pro', 'group'];
    const allowedStatuses = ['inactive', 'trialing', 'active', 'past_due', 'cancelled', 'grace'];
    if (subscriptionPlan && !allowedPlans.includes(subscriptionPlan)) {
      return res.status(400).json({ message: 'Plan invalide' });
    }
    if (subscriptionStatus && !allowedStatuses.includes(subscriptionStatus)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    if (subscriptionPlan) user.subscriptionPlan = subscriptionPlan;
    if (subscriptionStatus) user.subscriptionStatus = subscriptionStatus;
    user.subscriptionProductId = subscriptionProductId !== undefined ? String(subscriptionProductId || '').trim() : user.subscriptionProductId;
    user.subscriptionStore = subscriptionStore !== undefined ? String(subscriptionStore || '').trim() : user.subscriptionStore;
    user.subscriptionExpiresAt = subscriptionExpiresAt ? new Date(subscriptionExpiresAt) : null;
    user.subscriptionUpdatedAt = new Date();

    if (user.subscriptionStatus === 'grace') {
      user.isFoundingPartner = true;
      user.foundingPartnerGrantedAt = user.foundingPartnerGrantedAt || new Date();
    }

    if (['inactive', 'cancelled', 'past_due'].includes(user.subscriptionStatus) && !user.isFoundingPartner) {
      user.subscriptionExpiresAt = subscriptionExpiresAt ? new Date(subscriptionExpiresAt) : null;
    }

    pushSubscriptionHistory(user, {
      action: 'manual_update',
      source: 'admin',
      actorId: req.user?._id,
      actorName: req.user?.name || req.user?.email || 'Admin',
      note: note || 'Abonnement mis à jour manuellement depuis le dashboard admin',
    });

    await user.save();
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/settings', protect, requireAdmin, async (_req, res) => {
  try {
    let settings = await SystemSettings.findOne({ key: 'global' });
    if (!settings) settings = await SystemSettings.create({ key: 'global' });
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/settings', protect, requireAdmin, async (req, res) => {
  try {
    const updates = {};
    if (req.body.subscriptionBillingEnabled !== undefined) {
      updates.subscriptionBillingEnabled = Boolean(req.body.subscriptionBillingEnabled);
    }
    if (req.body.foundingPartnerDiscountPercent !== undefined) {
      updates.foundingPartnerDiscountPercent = Number(req.body.foundingPartnerDiscountPercent) || 0;
    }
    if (req.body.foundingPartnerGraceMonths !== undefined) {
      updates.foundingPartnerGraceMonths = Number(req.body.foundingPartnerGraceMonths) || 0;
    }

    const settings = await SystemSettings.findOneAndUpdate(
      { key: 'global' },
      { $set: updates, $setOnInsert: { key: 'global' } },
      { upsert: true, new: true }
    );

    if (updates.subscriptionBillingEnabled === false) {
      await User.updateMany(
        { type: 'business', isFoundingPartner: true, subscriptionStatus: { $in: ['inactive', 'cancelled', 'past_due'] } },
        { $set: { subscriptionStatus: 'grace' } }
      );
    }

    if (updates.subscriptionBillingEnabled === true) {
      await User.updateMany(
        { type: 'business', subscriptionStatus: 'grace' },
        { $set: { subscriptionStatus: 'inactive' } }
      );
    }

    res.json({ settings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/deliverables', protect, requireAdmin, async (_req, res) => {
  try {
    const submissions = await DeliverableSubmission.find()
      .populate('business', 'businessName')
      .populate('influencer', 'name instagram')
      .populate('event', 'title date city')
      .sort({ submittedAt: -1, createdAt: -1 })
      .limit(100);
    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /admin/users/:id
router.delete('/users/:id', protect, requireAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Candidatures (admin) ──────────────────────────────────────────────────────

// GET /admin/applications — toutes les candidatures
router.get('/applications', protect, requireAdmin, async (req, res) => {
  try {
    const applications = await Application.find()
      .populate('user', 'name city photos')
      .populate('event', 'title')
      .sort({ appliedAt: -1 });
    res.json({ applications });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /admin/applications/:id — détail d'une candidature
router.get('/applications/:id', protect, requireAdmin, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('user', 'name photos bio instagram tiktok followersCount score city reviewsCount scoreDetails')
      .populate('event', 'title date venue city creator');
    if (!application) return res.status(404).json({ message: 'Candidature introuvable' });
    res.json({ application });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Statistiques ──────────────────────────────────────────────────────────────

// GET /admin/stats — statistiques globales
router.get('/stats', protect, requireAdmin, async (req, res) => {
  try {
    const [totalUsers, pendingUsers, totalEvents, totalApplications] = await Promise.all([
      User.countDocuments({ type: { $ne: 'admin' } }),
      User.countDocuments({ status: 'pending' }),
      Event.countDocuments(),
      Application.countDocuments(),
    ]);

    const influencers = await User.countDocuments({ type: 'influencer', status: 'validated' });
    const businesses = await User.countDocuments({ type: 'business', status: 'validated' });

    const [starterBusinesses, proBusinesses, groupBusinesses, activeSubscriptions, foundingPartners, graceBusinesses, flaggedDeliverables] = await Promise.all([
      User.countDocuments({ type: 'business', subscriptionPlan: 'starter' }),
      User.countDocuments({ type: 'business', subscriptionPlan: 'pro' }),
      User.countDocuments({ type: 'business', subscriptionPlan: 'group' }),
      User.countDocuments({ type: 'business', subscriptionStatus: 'active' }),
      User.countDocuments({ type: 'business', isFoundingPartner: true }),
      User.countDocuments({ type: 'business', subscriptionStatus: 'grace' }),
      DeliverableSubmission.countDocuments({ status: 'flagged' }),
    ]);

    let settings = await SystemSettings.findOne({ key: 'global' });
    if (!settings) settings = await SystemSettings.create({ key: 'global' });

    res.json({
      totalUsers,
      pendingUsers,
      totalEvents,
      totalApplications,
      influencers,
      businesses,
      subscriptions: {
        starter: starterBusinesses,
        pro: proBusinesses,
        group: groupBusinesses,
        active: activeSubscriptions,
        grace: graceBusinesses,
        foundingPartners,
      },
      billing: {
        subscriptionBillingEnabled: settings.subscriptionBillingEnabled,
        foundingPartnerDiscountPercent: settings.foundingPartnerDiscountPercent,
        foundingPartnerGraceMonths: settings.foundingPartnerGraceMonths,
      },
      deliverables: {
        flagged: flaggedDeliverables,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Événements (admin) ────────────────────────────────────────────────────────

// GET /admin/events — tous les événements avec pagination
router.get('/events', protect, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, city, category, search } = req.query;
    const filter = {};
    if (city) filter.city = new RegExp(city, 'i');
    if (category) filter.category = category;
    if (search) filter.title = new RegExp(search, 'i');

    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate('creator', 'name businessName businessType businessLogo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Event.countDocuments(filter),
    ]);
    res.json({ events, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /admin/events/:id — récupérer un événement par son ID
router.get('/events/:id', protect, requireAdmin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('creator', 'name businessName businessType businessLogo');
    if (!event) return res.status(404).json({ message: 'Événement introuvable' });
    res.json({ event });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /admin/events — créer un événement (l'admin est le creator)
router.post('/events', protect, requireAdmin, async (req, res) => {
  try {
    const event = await Event.create({ ...req.body, creator: req.user._id });
    res.status(201).json({ event });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /admin/events/:id — modifier un événement
router.put('/events/:id', protect, requireAdmin, async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!event) return res.status(404).json({ message: 'Événement introuvable' });
    res.json({ event });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /admin/events/:id — supprimer un événement
router.delete('/events/:id', protect, requireAdmin, async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Événement supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /admin/events/:id/status — activer/désactiver/marquer complet
router.patch('/events/:id/status', protect, requireAdmin, async (req, res) => {
  try {
    const { isActive, isFull, isLive } = req.body;
    const update = {};
    if (isActive !== undefined) update.isActive = isActive;
    if (isFull !== undefined) update.isFull = isFull;
    if (isLive !== undefined) update.isLive = isLive;
    const event = await Event.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!event) return res.status(404).json({ message: 'Événement introuvable' });
    res.json({ event });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Seed ──────────────────────────────────────────────────────────────────────

// POST /admin/seed — créer le compte admin (à utiliser une seule fois)
router.post('/seed', async (req, res) => {
  try {
    const existing = await User.findOne({ type: 'admin' });
    if (existing) return res.status(400).json({ message: 'Admin déjà existant' });

    const admin = await User.create({
      name: 'Admin ONLIST',
      email: 'admin@onlist.app',
      password: 'Admin2024!',
      type: 'admin',
      status: 'validated',
    });

    res.status(201).json({ message: 'Admin créé', email: admin.email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
