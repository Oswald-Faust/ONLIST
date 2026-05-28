const express = require('express');
const Lieu = require('../models/Lieu');
const LieuReview = require('../models/LieuReview');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /lieux/mine — lieux du business connecté
router.get('/mine', protect, async (req, res) => {
  try {
    const lieux = await Lieu.find({ creator: req.user._id }).sort({ createdAt: -1 });
    res.json({ lieux });
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
    const lieu = await Lieu.create({ ...req.body, creator: req.user._id });
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
    res.json({ message: 'Lieu supprimé' });
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
    if (req.user.type !== 'influencer' && req.user.type !== 'admin')
      return res.status(403).json({ message: 'Réservé aux influenceurs' });

    const lieu = await Lieu.findById(req.params.id);
    if (!lieu) return res.status(404).json({ message: 'Lieu introuvable' });

    const { eventId, scores, comment } = req.body;
    let review = await LieuReview.findOne({
      influencer: req.user._id,
      lieu: req.params.id,
      event: eventId || null,
    });

    if (!review) {
      review = new LieuReview({
        influencer: req.user._id,
        business: lieu.creator,
        lieu: req.params.id,
        event: eventId || undefined,
      });
    }

    review.scores = scores;
    review.comment = comment;
    await review.save();

    const reviews = await LieuReview.find({ lieu: req.params.id });
    const n = reviews.length;
    const globalAvg = n ? reviews.reduce((sum, item) => sum + (item.globalScore || 0), 0) / n : 0;

    await Lieu.findByIdAndUpdate(req.params.id, {
      score: Math.round(globalAvg * 10) / 10,
      reviewsCount: n,
      'scoreDetails.ambience': avg(reviews, 'ambience'),
      'scoreDetails.service': avg(reviews, 'service'),
      'scoreDetails.value': avg(reviews, 'value'),
    });

    const updatedLieu = await Lieu.findById(req.params.id).select('score reviewsCount scoreDetails');
    res.status(201).json({ review, lieu: updatedLieu });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
