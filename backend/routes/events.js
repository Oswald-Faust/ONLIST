const express = require('express');
const Event = require('../models/Event');
const User = require('../models/User');
const Application = require('../models/Application');
const Review = require('../models/Review');
const EventView = require('../models/EventView');
const { protect, requireValidated } = require('../middleware/auth');
const { getBusinessPlan } = require('../utils/businessPlans');
const { getStripe, isStripeConfigured, getAppUrls, getBoostOffer } = require('../utils/stripe');
const { getOrCreateStripeCustomer } = require('../utils/stripeSubscription');
const { applyBoostFromSession } = require('../utils/eventBoost');

const router = express.Router();

function getDayRange(dateInput) {
  const date = new Date(dateInput);
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

async function countActiveEventsForDay(userId, dateInput, excludeEventId) {
  const { start, end } = getDayRange(dateInput);
  const filter = {
    creator: userId,
    isActive: true,
    date: { $gte: start, $lt: end },
  };
  if (excludeEventId) filter._id = { $ne: excludeEventId };
  return Event.countDocuments(filter);
}

function applyPlanEventLimits(payload, plan) {
  const nextPayload = { ...payload };

  if (plan.maxCreatorsPerEvent) {
    const requested = Number(payload.maxParticipants) || plan.maxCreatorsPerEvent;
    nextPayload.maxParticipants = Math.min(requested, plan.maxCreatorsPerEvent);
  }

  if (payload.applicationCutoffOffsetHours !== undefined) {
    nextPayload.applicationCutoffOffsetHours = Number(payload.applicationCutoffOffsetHours) || 1;
  }

  if (payload.plusOneMode) {
    nextPayload.plusOneMode = payload.plusOneMode;
  }

  if (payload.deliverables && Array.isArray(payload.deliverables)) {
    nextPayload.deliverables = payload.deliverables.filter(Boolean);
  }

  return nextPayload;
}

function buildCutoffTime({ date, startTime, applicationCutoffOffsetHours }) {
  if (!date || !applicationCutoffOffsetHours) return undefined;
  const baseDate = new Date(date);
  if (startTime && /^\d{2}:\d{2}$/.test(startTime)) {
    const [hours, minutes] = startTime.split(':').map(Number);
    baseDate.setHours(hours, minutes, 0, 0);
  }
  return new Date(baseDate.getTime() - Number(applicationCutoffOffsetHours) * 60 * 60 * 1000).toISOString();
}

function normalizeEventPayload(payload = {}) {
  const nextPayload = { ...payload };

  if (payload.plusOneMode === 'required') {
    const deliverables = Array.isArray(payload.deliverables) ? [...payload.deliverables] : [];
    if (!deliverables.includes('google_review_plus_one_screen')) {
      deliverables.push('google_review_plus_one_screen');
    }
    nextPayload.deliverables = deliverables;
  }

  if (payload.date && payload.startTime && !payload.cutoffTime && payload.applicationCutoffOffsetHours) {
    nextPayload.cutoffTime = buildCutoffTime(payload);
  }

  // Le boost n'est valide que si l'événement est sponsorisé ET la durée fait partie de l'enum.
  const VALID_BOOST_DAYS = [1, 3, 7, 14];
  if (!payload.isSponsored || !VALID_BOOST_DAYS.includes(Number(payload.boostDurationDays))) {
    nextPayload.boostDurationDays = undefined;
  } else {
    nextPayload.boostDurationDays = Number(payload.boostDurationDays);
  }

  return nextPayload;
}

async function archivePastEvents() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  await Event.updateMany(
    {
      isActive: true,
      status: { $ne: 'draft' },
      date: { $lt: startOfToday },
    },
    {
      $set: {
        isActive: false,
        isSponsored: false,
        isBoosted: false,
        boostExpiresAt: null,
      },
      $unset: {
        boostDurationDays: 1,
      },
    }
  );
}

async function clearExpiredBoosts() {
  const now = new Date();
  await Event.updateMany(
    {
      isBoosted: true,
      boostExpiresAt: { $lt: now },
    },
    {
      $set: {
        isBoosted: false,
        isSponsored: false,
        boostExpiresAt: null,
      },
      $unset: {
        boostDurationDays: 1,
      },
    }
  );
}

// Champs obligatoires pour publier un événement (un brouillon peut être incomplet)
function missingPublishFields(payload = {}) {
  const labels = { title: 'titre', description: 'description', city: 'ville', date: 'date' };
  return Object.keys(labels).filter((field) => !payload[field]).map((field) => labels[field]);
}

// GET /events — liste publique avec filtres
router.get('/', protect, requireValidated, async (req, res) => {
  try {
    await Promise.all([archivePastEvents(), clearExpiredBoosts()]);
    const { city, category, moment, page = 1, limit = 20 } = req.query;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    // Les brouillons ne sont jamais visibles côté influenceurs
    const filter = { isActive: true, status: { $ne: 'draft' }, date: { $gte: startOfToday } };

    if (city) filter.city = new RegExp(city, 'i');
    if (category) filter.category = category;
    if (moment) filter.moment = moment;

    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate('creator', 'name businessName businessType businessLogo city')
        .populate('lieu', 'name city photos score reviewsCount scoreDetails')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Event.countDocuments(filter),
    ]);

    res.json({ events, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /events/favorites/mine — événements mis en favoris par l'influenceur
router.get('/favorites/mine', protect, async (req, res) => {
  try {
    await Promise.all([archivePastEvents(), clearExpiredBoosts()]);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const user = await User.findById(req.user._id).populate({
      path: 'favorites',
      populate: [
        { path: 'creator', select: 'name businessName businessType businessLogo city' },
        { path: 'lieu', select: 'name city photos score reviewsCount scoreDetails' },
      ],
    });
    const favorites = (user?.favorites || []).filter((event) => (
      Boolean(event) && event.isActive !== false && event.status !== 'draft' && (!event.date || new Date(event.date) >= startOfToday)
    ));
    res.json({ events: favorites });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /events/:id/favorite — basculer un événement en favori
router.post('/:id/favorite', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).select('_id');
    if (!event) return res.status(404).json({ message: 'Événement introuvable' });

    const user = await User.findById(req.user._id);
    const exists = user.favorites.some((id) => String(id) === String(event._id));

    if (exists) {
      user.favorites = user.favorites.filter((id) => String(id) !== String(event._id));
    } else {
      user.favorites.push(event._id);
    }
    await user.save();

    res.json({ favorited: !exists, favorites: user.favorites });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /events/:id
router.get('/:id', protect, async (req, res) => {
  try {
    await Promise.all([archivePastEvents(), clearExpiredBoosts()]);
    const event = await Event.findById(req.params.id)
      .populate('creator', 'name businessName businessType businessLogo city businessAddress')
      .populate('lieu', 'name city photos score reviewsCount scoreDetails description');
    if (!event) return res.status(404).json({ message: 'Événement introuvable' });
    res.json({ event });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /events — business uniquement
router.post('/', protect, requireValidated, async (req, res) => {
  try {
    if (req.user.type !== 'business' && req.user.type !== 'admin')
      return res.status(403).json({ message: 'Réservé aux établissements' });

    const plan = getBusinessPlan(req.user);
    const status = req.body.status === 'draft' ? 'draft' : 'published';
    const isActive = status === 'draft' ? false : (req.body.isActive !== false);

    if (status === 'published') {
      const missing = missingPublishFields(req.body);
      if (missing.length) {
        return res.status(400).json({ message: `Pour publier, complète : ${missing.join(', ')}.` });
      }
      const nextDate = req.body.date ? new Date(req.body.date) : null;
      if (plan.maxActiveEventsPerDay && isActive && nextDate) {
        const activeEventsCount = await countActiveEventsForDay(req.user._id, nextDate);
        if (activeEventsCount >= plan.maxActiveEventsPerDay) {
          return res.status(400).json({
            message: `Votre abonnement ${plan.name} est limité à ${plan.maxActiveEventsPerDay} événement${plan.maxActiveEventsPerDay > 1 ? 's' : ''} actif${plan.maxActiveEventsPerDay > 1 ? 's' : ''} ce jour-là`,
          });
        }
      }
    }

    const event = await Event.create({
      ...normalizeEventPayload(applyPlanEventLimits(req.body, plan)),
      status,
      isActive,
      creator: req.user._id,
    });
    res.status(201).json({ event });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /events/:id — mise à jour par le créateur
router.put('/:id', protect, requireValidated, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Événement introuvable' });
    if (event.creator.toString() !== req.user._id.toString() && req.user.type !== 'admin')
      return res.status(403).json({ message: 'Non autorisé' });

    const plan = getBusinessPlan(req.user);
    const nextStatus = req.body.status
      ? (req.body.status === 'draft' ? 'draft' : 'published')
      : (event.status || 'published');
    const nextIsActive = nextStatus === 'draft'
      ? false
      : (req.body.isActive !== undefined ? req.body.isActive : (event.isActive !== false));
    const nextDate = req.body.date ? new Date(req.body.date) : event.date;

    if (nextStatus === 'published') {
      const merged = {
        title: req.body.title !== undefined ? req.body.title : event.title,
        description: req.body.description !== undefined ? req.body.description : event.description,
        city: req.body.city !== undefined ? req.body.city : event.city,
        date: req.body.date !== undefined ? req.body.date : event.date,
      };
      const missing = missingPublishFields(merged);
      if (missing.length) {
        return res.status(400).json({ message: `Pour publier, complète : ${missing.join(', ')}.` });
      }
      if (plan.maxActiveEventsPerDay && nextIsActive !== false) {
        const activeEventsCount = await countActiveEventsForDay(req.user._id, nextDate, event._id);
        if (activeEventsCount >= plan.maxActiveEventsPerDay) {
          return res.status(400).json({
            message: `Votre abonnement ${plan.name} est limité à ${plan.maxActiveEventsPerDay} événement${plan.maxActiveEventsPerDay > 1 ? 's' : ''} actif${plan.maxActiveEventsPerDay > 1 ? 's' : ''} ce jour-là`,
          });
        }
      }
    }

    const updated = await Event.findByIdAndUpdate(
      req.params.id,
      { ...normalizeEventPayload(applyPlanEventLimits(req.body, plan)), status: nextStatus, isActive: nextIsActive },
      { new: true }
    );
    res.json({ event: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /events/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Événement introuvable' });
    if (event.creator.toString() !== req.user._id.toString() && req.user.type !== 'admin')
      return res.status(403).json({ message: 'Non autorisé' });

    await event.deleteOne();
    res.json({ message: 'Événement supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /events/business/mine — événements du business connecté
router.get('/business/mine', protect, requireValidated, async (req, res) => {
  try {
    await clearExpiredBoosts();
    const filter = { creator: req.user._id };
    // Scoping optionnel sur l'établissement actif (?lieu=<id>).
    // On inclut aussi les événements sans lieu pour qu'ils restent toujours
    // visibles par leur créateur (sinon ils disparaissent quand un lieu actif est défini).
    if (req.query.lieu) {
      filter.$or = [{ lieu: req.query.lieu }, { lieu: { $exists: false } }, { lieu: null }];
    }
    const events = await Event.find(filter).sort({ date: -1 });
    res.json({ events });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/boost/checkout', protect, requireValidated, async (req, res) => {
  try {
    if (req.user.type !== 'business' && req.user.type !== 'admin') {
      return res.status(403).json({ message: 'Réservé aux établissements' });
    }
    if (!isStripeConfigured()) {
      return res.status(503).json({ message: 'Paiement Stripe non configuré sur le serveur.' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Événement introuvable' });
    if (String(event.creator) !== String(req.user._id) && req.user.type !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé' });
    }
    if (!event.isActive || event.status === 'draft') {
      return res.status(400).json({ message: 'Publiez d’abord l’événement avant d’activer un boost.' });
    }
    if (event.date && new Date(event.date) < new Date()) {
      return res.status(400).json({ message: 'Impossible de booster un événement déjà passé.' });
    }
    // Pas de cumul : un boost déjà actif doit expirer avant d'en relancer un.
    if (event.isBoosted && event.boostExpiresAt && new Date(event.boostExpiresAt) > new Date()) {
      return res.status(400).json({ message: 'Cet événement est déjà boosté. Attendez la fin du boost en cours.' });
    }

    const days = Number(req.body?.days || 0);
    const offer = getBoostOffer(days);
    if (!offer) {
      return res.status(400).json({ message: 'Durée de boost invalide.' });
    }

    const stripe = getStripe();
    const customerId = await getOrCreateStripeCustomer(req.user);
    const urls = getAppUrls();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      client_reference_id: String(req.user._id),
      invoice_creation: { enabled: true },
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(offer.amount * 100),
          product_data: {
            name: `${offer.label} ONLIST`,
            description: `Mise en avant de l'événement "${event.title || 'Événement'}" pendant ${offer.days} jour${offer.days > 1 ? 's' : ''}`,
          },
        },
        quantity: 1,
      }],
      metadata: {
        type: 'event_boost',
        userId: String(req.user._id),
        eventId: String(event._id),
        boostDays: String(offer.days),
      },
      success_url: urls.boostSuccess,
      cancel_url: urls.boostCancel,
    });

    event.boostCheckoutSessionId = session.id;
    await event.save();

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe boost checkout error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// POST /events/:id/boost/confirm — active le boost au retour du paiement,
// sans dépendre du webhook (vérifie la session Stripe et applique si payée).
router.post('/:id/boost/confirm', protect, requireValidated, async (req, res) => {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({ message: 'Paiement Stripe non configuré sur le serveur.' });
    }
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Événement introuvable' });
    if (String(event.creator) !== String(req.user._id) && req.user.type !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    const sessionId = req.body?.sessionId || event.boostCheckoutSessionId;
    if (!sessionId) {
      return res.status(400).json({ message: 'Session de paiement introuvable.' });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.type !== 'event_boost' || String(session.metadata?.eventId) !== String(event._id)) {
      return res.status(400).json({ message: 'Session de paiement invalide pour cet événement.' });
    }
    if (session.payment_status !== 'paid') {
      return res.json({ activated: false, paymentStatus: session.payment_status, event });
    }

    await applyBoostFromSession(event, session);
    res.json({ activated: !!event.isBoosted, event });
  } catch (err) {
    console.error('Stripe boost confirm error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── Statistiques d'événement ────────────────────────────────────────────────

// Construit une série [{ date:'YYYY-MM-DD', count }] couvrant chaque jour de [start, end].
function buildDailySeries(dates, start, end) {
  const buckets = new Map();
  const cursor = new Date(start);
  while (cursor <= end) {
    buckets.set(cursor.toISOString().slice(0, 10), 0);
    cursor.setDate(cursor.getDate() + 1);
  }
  dates.forEach((d) => {
    if (!d) return;
    const key = new Date(d).toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
  });
  return Array.from(buckets, ([date, count]) => ({ date, count }));
}

// POST /events/:id/view — un influenceur ouvre la fiche : on enregistre la vue.
router.post('/:id/view', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).select('_id creator');
    if (!event) return res.status(404).json({ message: 'Événement introuvable' });
    // On ne compte ni le créateur de l'événement ni les comptes non-influenceurs.
    if (req.user.type !== 'influencer' || String(event.creator) === String(req.user._id)) {
      return res.json({ viewId: null });
    }
    const view = await EventView.create({ event: event._id, user: req.user._id });
    res.json({ viewId: view._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /events/:id/view/:viewId — met à jour la durée de consultation à la sortie.
router.patch('/:id/view/:viewId', protect, async (req, res) => {
  try {
    const durationMs = Math.max(0, Math.min(Number(req.body?.durationMs) || 0, 60 * 60 * 1000));
    const view = await EventView.findOne({ _id: req.params.viewId, user: req.user._id });
    if (!view) return res.status(404).json({ message: 'Vue introuvable' });
    view.durationMs = durationMs;
    await view.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /events/:id/stats — tableau de bord agrégé (réservé au créateur / admin).
router.get('/:id/stats', protect, requireValidated, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .select('_id creator createdAt isBoosted isSponsored boostExpiresAt boostDurationDays boostLastPaidAt boostCount boostTotalSpent boostAmountPaid');
    if (!event) return res.status(404).json({ message: 'Événement introuvable' });
    if (String(event.creator) !== String(req.user._id) && req.user.type !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    // Fenêtre du graphe : depuis la création de l'événement, plafonnée à 90 jours.
    const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
    const createdAt = event.createdAt || event._id.getTimestamp();
    let start = new Date(createdAt);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    if (end.getTime() - start.getTime() > NINETY_DAYS) {
      start = new Date(end.getTime() - NINETY_DAYS);
    }

    const [views, applications, reviews] = await Promise.all([
      EventView.find({ event: event._id }).select('user viewedAt durationMs').lean(),
      Application.find({ event: event._id })
        .select('status appliedAt checkedIn user')
        .populate('user', 'followersCount')
        .lean(),
      Review.find({ event: event._id }).select('globalScore').lean(),
    ]);

    // Vues
    const totalDuration = views.reduce((sum, v) => sum + (v.durationMs || 0), 0);
    const viewsStats = {
      total: views.length,
      uniqueViewers: new Set(views.map((v) => String(v.user))).size,
      avgDurationSec: views.length ? Math.round(totalDuration / views.length / 1000) : 0,
      long3s: views.filter((v) => (v.durationMs || 0) >= 3000).length,
      long1m: views.filter((v) => (v.durationMs || 0) >= 60000).length,
      series: buildDailySeries(views.map((v) => v.viewedAt), start, end),
    };

    // Candidatures
    const byStatus = { pending: 0, accepted: 0, rejected: 0 };
    applications.forEach((a) => { if (byStatus[a.status] != null) byStatus[a.status] += 1; });
    const decided = byStatus.accepted + byStatus.rejected;
    const applicationsStats = {
      total: applications.length,
      pending: byStatus.pending,
      accepted: byStatus.accepted,
      rejected: byStatus.rejected,
      acceptanceRate: decided ? Math.round((byStatus.accepted / decided) * 100) : 0,
      series: buildDailySeries(applications.map((a) => a.appliedAt), start, end),
    };

    // Présence
    const acceptedApps = applications.filter((a) => a.status === 'accepted');
    const checkedIn = acceptedApps.filter((a) => a.checkedIn).length;
    const attendance = {
      accepted: acceptedApps.length,
      checkedIn,
      attendanceRate: acceptedApps.length ? Math.round((checkedIn / acceptedApps.length) * 100) : 0,
    };

    // Reach (audience cumulée des influenceurs acceptés)
    const followers = acceptedApps.map((a) => a.user?.followersCount || 0);
    const totalFollowers = followers.reduce((sum, n) => sum + n, 0);
    const reach = {
      totalFollowers,
      avgFollowers: followers.length ? Math.round(totalFollowers / followers.length) : 0,
    };

    // Avis reçus sur l'événement
    const reviewScores = reviews.map((r) => r.globalScore).filter((n) => typeof n === 'number');
    const reviewsStats = {
      count: reviews.length,
      avgScore: reviewScores.length
        ? Number((reviewScores.reduce((sum, n) => sum + n, 0) / reviewScores.length).toFixed(1))
        : 0,
    };

    // Entonnoir de conversion
    const funnel = [
      { key: 'views', label: 'Vues', value: viewsStats.total },
      { key: 'applications', label: 'Candidatures', value: applicationsStats.total },
      { key: 'accepted', label: 'Acceptés', value: attendance.accepted },
      { key: 'present', label: 'Présents', value: attendance.checkedIn },
    ];

    // Boost (mesure)
    const boostActive = !!(event.isBoosted && event.boostExpiresAt && new Date(event.boostExpiresAt) > new Date());
    const daysRemaining = boostActive
      ? Math.max(0, Math.ceil((new Date(event.boostExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;
    const boost = {
      isActive: boostActive,
      expiresAt: event.boostExpiresAt || null,
      daysRemaining,
      durationDays: event.boostDurationDays || 0,
      count: event.boostCount || 0,
      totalSpent: event.boostTotalSpent || 0,
      lastPaidAt: event.boostLastPaidAt || null,
    };

    res.json({
      range: { from: start, to: end },
      views: viewsStats,
      applications: applicationsStats,
      attendance,
      reach,
      reviews: reviewsStats,
      funnel,
      boost,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
