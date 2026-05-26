const express = require('express');
const Application = require('../models/Application');
const Event = require('../models/Event');
const { protect, requireValidated } = require('../middleware/auth');
const { createNotification } = require('../utils/notifications');

const router = express.Router();

// POST /applications — postuler à un événement
router.post('/', protect, requireValidated, async (req, res) => {
  try {
    if (req.user.type !== 'influencer')
      return res.status(403).json({ message: 'Réservé aux influenceurs' });

    const { eventId, message } = req.body;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Événement introuvable' });

    const existing = await Application.findOne({ user: req.user._id, event: eventId });
    if (existing) return res.status(400).json({ message: 'Déjà postulé à cet événement' });

    const application = await Application.create({
      user: req.user._id,
      event: eventId,
      message,
    });

    await createNotification({
      userId: event.creator,
      actorId: req.user._id,
      type: 'application_received',
      category: 'events',
      title: 'Nouvelle candidature',
      body: `${req.user.name || 'Un influenceur'} a postulé à ${event.title}.`,
      entityType: 'application',
      entityId: application._id,
      data: {
        eventId: `${event._id}`,
        eventTitle: event.title,
        city: event.city,
      },
    });

    res.status(201).json({ application });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /applications/my — mes candidatures (influenceur)
router.get('/my', protect, requireValidated, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const applications = await Application.find(filter)
      .populate('event', 'title images date city venue category moment offer creator')
      .populate({ path: 'event', populate: { path: 'creator', select: 'businessName businessLogo' } })
      .sort({ appliedAt: -1 });

    res.json({ applications });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /applications/event/:eventId — candidatures pour un événement (business)
router.get('/event/:eventId', protect, requireValidated, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Événement introuvable' });
    if (event.creator.toString() !== req.user._id.toString() && req.user.type !== 'admin')
      return res.status(403).json({ message: 'Non autorisé' });

    const applications = await Application.find({ event: req.params.eventId })
      .populate('user', 'name photos instagram tiktok followersCount score city bio')
      .sort({ appliedAt: -1 });

    res.json({ applications });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /applications/:id — accepter ou refuser (business)
router.put('/:id', protect, requireValidated, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id).populate('event');
    if (!application) return res.status(404).json({ message: 'Candidature introuvable' });

    const event = application.event;
    if (event.creator.toString() !== req.user._id.toString() && req.user.type !== 'admin')
      return res.status(403).json({ message: 'Non autorisé' });

    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status))
      return res.status(400).json({ message: 'Statut invalide' });

    application.status = status;
    application.respondedAt = new Date();
    await application.save();

    if (status === 'accepted') {
      await Event.findByIdAndUpdate(event._id, { $inc: { acceptedCount: 1 } });
    }

    await createNotification({
      userId: application.user,
      actorId: req.user._id,
      type: status === 'accepted' ? 'application_accepted' : 'application_rejected',
      category: 'events',
      title: status === 'accepted' ? 'Candidature confirmée' : 'Candidature refusée',
      body: status === 'accepted'
        ? `Bonne nouvelle, ${event.title} a confirmé votre participation.`
        : `${event.title} n’a pas retenu votre candidature.`,
      entityType: 'event',
      entityId: event._id,
      data: {
        eventId: `${event._id}`,
        eventTitle: event.title,
        city: event.city,
        status,
      },
    });

    res.json({ application });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /applications/invite — inviter un influenceur (business)
router.post('/invite', protect, requireValidated, async (req, res) => {
  try {
    if (req.user.type !== 'business' && req.user.type !== 'admin')
      return res.status(403).json({ message: 'Réservé aux établissements' });

    const { userId, eventId } = req.body;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Événement introuvable' });
    if (event.creator.toString() !== req.user._id.toString() && req.user.type !== 'admin')
      return res.status(403).json({ message: 'Non autorisé' });

    const existing = await Application.findOne({ user: userId, event: eventId });
    if (existing) return res.status(400).json({ message: 'Déjà invité ou postulé' });

    const application = await Application.create({
      user: userId,
      event: eventId,
      isInvitation: true,
      status: 'pending',
    });

    await createNotification({
      userId,
      actorId: req.user._id,
      type: 'event_invite',
      category: 'invites',
      title: 'Nouvelle invitation',
      body: `Vous avez reçu une invitation pour ${event.title}.`,
      entityType: 'event',
      entityId: event._id,
      data: {
        eventId: `${event._id}`,
        applicationId: `${application._id}`,
        eventTitle: event.title,
        city: event.city,
        venue: event.venue,
      },
    });

    res.status(201).json({ application });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
