const express = require('express');
const User = require('../models/User');
const Review = require('../models/Review');
const { protect, requireValidated } = require('../middleware/auth');

const router = express.Router();

// GET /users — liste des influenceurs validés (pour business)
router.get('/', protect, requireValidated, async (req, res) => {
  try {
    const { city, minFollowers, minScore, page = 1, limit = 20 } = req.query;
    const filter = { type: 'influencer', status: 'validated' };

    if (city) filter.city = new RegExp(city, 'i');
    if (minFollowers) filter.followersCount = { $gte: Number(minFollowers) };
    if (minScore) filter.score = { $gte: Number(minScore) };

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('name photos instagram tiktok followersCount score city bio reviewsCount')
        .sort({ score: -1, followersCount: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(filter),
    ]);

    res.json({ users, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /users/:id — profil public
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password');
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /users/me — modifier son profil
router.put('/me', protect, async (req, res) => {
  try {
    const allowed = ['name', 'bio', 'city', 'country', 'instagram', 'tiktok', 'youtube',
      'followersCount', 'photos', 'businessDescription', 'businessAddress', 'businessCity'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /users/:id/review — noter un influenceur (business)
router.post('/:id/review', protect, requireValidated, async (req, res) => {
  try {
    if (req.user.type !== 'business')
      return res.status(403).json({ message: 'Réservé aux établissements' });

    const { eventId, scores, comment } = req.body;
    const review = await Review.create({
      influencer: req.params.id,
      business: req.user._id,
      event: eventId,
      scores,
      comment,
    });

    // Recalcul du score moyen de l'influenceur
    const reviews = await Review.find({ influencer: req.params.id });
    const avgScore = reviews.reduce((s, r) => s + r.globalScore, 0) / reviews.length;
    await User.findByIdAndUpdate(req.params.id, {
      score: Math.round(avgScore * 10) / 10,
      reviewsCount: reviews.length,
    });

    res.status(201).json({ review });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
