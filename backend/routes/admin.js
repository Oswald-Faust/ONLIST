const express = require('express');
const User = require('../models/User');
const Event = require('../models/Event');
const Application = require('../models/Application');
const { protect, requireAdmin } = require('../middleware/auth');
const { createNotification } = require('../utils/notifications');
const {
  sendInfluencerValidatedEmail,
  sendInfluencerRejectedEmail,
  sendBusinessValidatedEmail,
  sendBusinessRejectedEmail,
} = require('../utils/mailer');

const router = express.Router();

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

    res.json({ totalUsers, pendingUsers, totalEvents, totalApplications, influencers, businesses });
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
