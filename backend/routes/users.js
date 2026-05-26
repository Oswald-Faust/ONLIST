const express = require('express');
const User = require('../models/User');
const Review = require('../models/Review');
const { protect, requireValidated } = require('../middleware/auth');

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────────────────────
const avg = (arr, key) =>
  arr.length ? Math.round((arr.reduce((s, r) => s + (r.scores?.[key] || 0), 0) / arr.length) * 10) / 10 : 0;

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

// GET /users/me/score — health score détaillé de l'utilisateur connecté
router.get('/me/score', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('score reviewsCount scoreDetails');
    const reviews = await Review.find({ influencer: req.user._id })
      .select('globalScore scores comment createdAt business')
      .populate('business', 'businessName')
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({
      score: user.score || 0,
      reviewsCount: user.reviewsCount || 0,
      scoreDetails: user.scoreDetails || {},
      reviews,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /users/:id — profil public
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /users/me — modifier son profil
router.put('/me', protect, async (req, res) => {
  try {
    const allowed = ['name', 'bio', 'city', 'country', 'nationality', 'gender', 'dateOfBirth',
      'instagram', 'tiktok', 'youtube', 'followersCount', 'photos',
      'businessDescription', 'businessAddress', 'businessCity', 'selectedCity'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /users/me/password — changer son mot de passe
router.put('/me/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Les deux mots de passe sont requis' });
    if (newPassword.length < 8)
      return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 8 caractères' });

    const user = await User.findById(req.user._id).select('+password');
    if (!user.password)
      return res.status(400).json({ message: 'Ce compte utilise une connexion sociale, pas de mot de passe' });

    const valid = await user.comparePassword(currentPassword);
    if (!valid)
      return res.status(401).json({ message: 'Mot de passe actuel incorrect' });

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /users/me/push-token
router.put('/me/push-token', protect, async (req, res) => {
  try {
    const { expoPushToken } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { expoPushToken: expoPushToken || '' },
      { new: true }
    );
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /users/me — supprimer son compte
router.delete('/me', protect, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: 'Compte supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /users/:id/review — noter un influenceur (business uniquement)
router.post('/:id/review', protect, requireValidated, async (req, res) => {
  try {
    if (req.user.type !== 'business' && req.user.type !== 'admin')
      return res.status(403).json({ message: 'Réservé aux établissements' });

    const { eventId, scores, comment } = req.body;
    
    let businessId = req.user._id;
    if (req.user.type === 'admin') {
      const Event = require('../models/Event');
      const event = await Event.findById(eventId);
      if (event) businessId = event.creator;
    }

    const review = await Review.create({
      influencer: req.params.id,
      business: businessId,
      event: eventId,
      scores,
      comment,
    });

    // Recalcul de toutes les moyennes
    const reviews = await Review.find({ influencer: req.params.id });
    const n = reviews.length;
    const globalAvg = reviews.reduce((s, r) => s + (r.globalScore || 0), 0) / n;

    await User.findByIdAndUpdate(req.params.id, {
      score: Math.round(globalAvg * 10) / 10,
      reviewsCount: n,
      'scoreDetails.punctuality': avg(reviews, 'punctuality'),
      'scoreDetails.style':       avg(reviews, 'style'),
      'scoreDetails.attitude':    avg(reviews, 'attitude'),
      'scoreDetails.content':     avg(reviews, 'content'),
    });

    res.status(201).json({ review });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
