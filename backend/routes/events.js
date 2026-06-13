const express = require('express');
const Event = require('../models/Event');
const User = require('../models/User');
const { protect, requireValidated } = require('../middleware/auth');
const { getBusinessPlan } = require('../utils/businessPlans');

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

// Champs obligatoires pour publier un événement (un brouillon peut être incomplet)
function missingPublishFields(payload = {}) {
  const labels = { title: 'titre', description: 'description', city: 'ville', date: 'date' };
  return Object.keys(labels).filter((field) => !payload[field]).map((field) => labels[field]);
}

// GET /events — liste publique avec filtres
router.get('/', protect, requireValidated, async (req, res) => {
  try {
    const { city, category, moment, page = 1, limit = 20 } = req.query;
    // Les brouillons ne sont jamais visibles côté influenceurs
    const filter = { isActive: true, status: { $ne: 'draft' } };

    if (city) filter.city = new RegExp(city, 'i');
    if (category) filter.category = category;
    if (moment) filter.moment = moment;

    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate('creator', 'name businessName businessType businessLogo city')
        .populate('lieu', 'name city photos score reviewsCount scoreDetails')
        .sort({ isSponsored: -1, date: 1 })
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
    const user = await User.findById(req.user._id).populate({
      path: 'favorites',
      populate: [
        { path: 'creator', select: 'name businessName businessType businessLogo city' },
        { path: 'lieu', select: 'name city photos score reviewsCount scoreDetails' },
      ],
    });
    const favorites = (user?.favorites || []).filter(Boolean);
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
    const filter = { creator: req.user._id };
    // Scoping optionnel sur l'établissement actif (?lieu=<id>)
    if (req.query.lieu) filter.lieu = req.query.lieu;
    const events = await Event.find(filter).sort({ date: -1 });
    res.json({ events });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
