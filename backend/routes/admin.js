const express = require('express');
const User = require('../models/User');
const Event = require('../models/Event');
const Application = require('../models/Application');
const { protect, requireAdmin } = require('../middleware/auth');

const router = express.Router();

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
