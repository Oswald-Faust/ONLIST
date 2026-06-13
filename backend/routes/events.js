const express = require('express');
const Event = require('../models/Event');
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

  return nextPayload;
}

// GET /events — liste publique avec filtres
router.get('/', protect, requireValidated, async (req, res) => {
  try {
    const { city, category, moment, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };

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
    const nextDate = req.body.date ? new Date(req.body.date) : null;
    if (plan.maxActiveEventsPerDay && req.body.isActive !== false && nextDate) {
      const activeEventsCount = await countActiveEventsForDay(req.user._id, nextDate);
      if (activeEventsCount >= plan.maxActiveEventsPerDay) {
        return res.status(400).json({
          message: `Votre abonnement ${plan.name} est limité à ${plan.maxActiveEventsPerDay} événement${plan.maxActiveEventsPerDay > 1 ? 's' : ''} actif${plan.maxActiveEventsPerDay > 1 ? 's' : ''} ce jour-là`,
        });
      }
    }

    const event = await Event.create({
      ...normalizeEventPayload(applyPlanEventLimits(req.body, plan)),
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
    const nextIsActive = req.body.isActive !== undefined ? req.body.isActive : event.isActive;
    const nextDate = req.body.date ? new Date(req.body.date) : event.date;

    if (plan.maxActiveEventsPerDay && nextIsActive !== false) {
      const activeEventsCount = await countActiveEventsForDay(req.user._id, nextDate, event._id);
      if (activeEventsCount >= plan.maxActiveEventsPerDay) {
        return res.status(400).json({
          message: `Votre abonnement ${plan.name} est limité à ${plan.maxActiveEventsPerDay} événement${plan.maxActiveEventsPerDay > 1 ? 's' : ''} actif${plan.maxActiveEventsPerDay > 1 ? 's' : ''} ce jour-là`,
        });
      }
    }

    const updated = await Event.findByIdAndUpdate(
      req.params.id,
      normalizeEventPayload(applyPlanEventLimits(req.body, plan)),
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
    const events = await Event.find({ creator: req.user._id }).sort({ date: -1 });
    res.json({ events });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
