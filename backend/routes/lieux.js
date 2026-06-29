const express = require('express');
const Lieu = require('../models/Lieu');
const LieuReview = require('../models/LieuReview');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { getBusinessPlan } = require('../utils/businessPlans');

const router = express.Router();

// GET /lieux/mine — lieux du business connecté (+ établissement actif)
router.get('/mine', protect, async (req, res) => {
  try {
    const lieux = await Lieu.find({ creator: req.user._id }).sort({ createdAt: -1 });
    res.json({ lieux, activeLieu: req.user.activeLieu || null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /lieux/active — définir l'établissement actif (doit être défini AVANT /:id)
router.put('/active', protect, async (req, res) => {
  try {
    const { lieuId } = req.body;
    if (!lieuId) return res.status(400).json({ message: 'lieuId requis' });
    const lieu = await Lieu.findOne({ _id: lieuId, creator: req.user._id });
    if (!lieu) return res.status(404).json({ message: 'Établissement introuvable' });
    await User.findByIdAndUpdate(req.user._id, { activeLieu: lieu._id });
    res.json({ activeLieu: lieu._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/prefill/first', protect, async (req, res) => {
  try {
    if (req.user.type !== 'business' && req.user.type !== 'admin') {
      return res.status(403).json({ message: 'Réservé aux établissements' });
    }

    const existingLieu = await Lieu.findOne({ creator: req.user._id }).sort({ createdAt: 1 });
    if (existingLieu) {
      return res.json({ prefill: existingLieu.toObject(), existingLieu });
    }

    res.json({
      prefill: {
        name: req.user.businessName || '',
        category: req.user.businessType || '',
        address: req.user.businessAddress || '',
        city: req.user.businessCity || '',
        description: req.user.businessDescription || '',
        logo: req.user.businessLogo || '',
        bannerPhoto: req.user.businessBannerPhoto || '',
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /lieux/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const lieu = await Lieu.findById(req.params.id).populate('creator', 'businessName name businessLogo');
    if (!lieu) return res.status(404).json({ message: 'Lieu introuvable' });
    res.json({ lieu });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /lieux — créer un lieu
router.post('/', protect, async (req, res) => {
  try {
    const plan = getBusinessPlan(req.user);
    if (plan.maxLieux) {
      const lieuxCount = await Lieu.countDocuments({ creator: req.user._id });
      if (lieuxCount >= plan.maxLieux) {
        return res.status(400).json({
          message: `Votre abonnement ${plan.name} est limité à ${plan.maxLieux} établissement${plan.maxLieux > 1 ? 's' : ''}`,
        });
      }
    }
    const payload = {
      ...req.body,
      photos: Array.isArray(req.body.photos) ? req.body.photos : [],
      logo: req.body.logo || '',
      bannerPhoto: req.body.bannerPhoto || '',
      creator: req.user._id,
    };
    const lieu = await Lieu.create(payload);
    // Le premier établissement créé devient automatiquement l'établissement actif
    if (!req.user.activeLieu) {
      await User.findByIdAndUpdate(req.user._id, { activeLieu: lieu._id });
    }
    res.status(201).json({ lieu });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /lieux/:id — modifier un lieu
router.put('/:id', protect, async (req, res) => {
  try {
    const lieu = await Lieu.findOneAndUpdate(
      { _id: req.params.id, creator: req.user._id },
      req.body,
      { new: true }
    );
    if (!lieu) return res.status(404).json({ message: 'Lieu introuvable' });
    res.json({ lieu });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /lieux/:id — supprimer un lieu
router.delete('/:id', protect, async (req, res) => {
  try {
    const lieu = await Lieu.findOneAndDelete({ _id: req.params.id, creator: req.user._id });
    if (!lieu) return res.status(404).json({ message: 'Lieu introuvable' });
    // Si l'établissement supprimé était l'actif, on bascule sur un autre (ou aucun)
    if (String(req.user.activeLieu) === String(lieu._id)) {
      const fallback = await Lieu.findOne({ creator: req.user._id }).sort({ createdAt: 1 });
      await User.findByIdAndUpdate(req.user._id, { activeLieu: fallback ? fallback._id : null });
    }
    res.json({ message: 'Lieu supprimé', activeLieu: undefined });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const avg = (arr, key) =>
  arr.length ? Math.round((arr.reduce((sum, item) => sum + (item.scores?.[key] || 0), 0) / arr.length) * 10) / 10 : 0;

router.get('/:id/reviews', protect, async (req, res) => {
  try {
    const [lieu, reviews] = await Promise.all([
      Lieu.findById(req.params.id).select('score reviewsCount scoreDetails name'),
      LieuReview.find({ lieu: req.params.id })
        .populate('influencer', 'name photos instagram')
        .sort({ createdAt: -1 })
        .limit(20),
    ]);
    if (!lieu) return res.status(404).json({ message: 'Lieu introuvable' });
    res.json({ lieu, reviews });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/review', protect, async (req, res) => {
  try {
    return res.status(410).json({ message: "La notation des établissements par les influenceurs est actuellement désactivée." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
