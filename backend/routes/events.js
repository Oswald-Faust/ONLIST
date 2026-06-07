const express = require('express');
const Event = require('../models/Event');
const { protect, requireValidated } = require('../middleware/auth');
const { getBusinessPlan } = require('../utils/businessPlans');

const router = express.Router();

async function countFutureActiveEvents(userId, excludeEventId) {
  const filter = {
    creator: userId,
    isActive: true,
    date: { $gte: new Date() },
  };
  if (excludeEventId) filter._id = { $ne: excludeEventId };
  return Event.countDocuments(filter);
}

function applyPlanEventLimits(payload, plan) {
  if (!plan.maxCreatorsPerEvent) return payload;
  const requested = Number(payload.maxParticipants) || plan.maxCreatorsPerEvent;
  return {
    ...payload,
    maxParticipants: Math.min(requested, plan.maxCreatorsPerEvent),
  };
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
    if (plan.maxActiveEvents && req.body.isActive !== false) {
      const activeEventsCount = await countFutureActiveEvents(req.user._id);
      if (activeEventsCount >= plan.maxActiveEvents) {
        return res.status(400).json({
          message: `Votre abonnement ${plan.name} est limité à ${plan.maxActiveEvents} événements actifs simultanés`,
        });
      }
    }

    const event = await Event.create({
      ...applyPlanEventLimits(req.body, plan),
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

    if (plan.maxActiveEvents && nextIsActive !== false && nextDate >= new Date()) {
      const activeEventsCount = await countFutureActiveEvents(req.user._id, event._id);
      if (activeEventsCount >= plan.maxActiveEvents) {
        return res.status(400).json({
          message: `Votre abonnement ${plan.name} est limité à ${plan.maxActiveEvents} événements actifs simultanés`,
        });
      }
    }

    const updated = await Event.findByIdAndUpdate(
      req.params.id,
      applyPlanEventLimits(req.body, plan),
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
