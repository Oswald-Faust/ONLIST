const express = require('express');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

const router = express.Router();

const CATEGORIES = ['events', 'invites', 'profile', 'system'];

router.get('/', protect, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const category = `${req.query.category || ''}`.trim();
    const unreadOnly = `${req.query.unreadOnly || ''}` === 'true';

    const filter = { user: req.user._id };
    if (category && category !== 'all') filter.category = category;
    if (unreadOnly) filter.isRead = false;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const unreadDocs = await Notification.aggregate([
      { $match: { user: req.user._id, isRead: false } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const unreadByCategory = unreadDocs.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const unreadCount = unreadDocs.reduce((sum, item) => sum + item.count, 0);
    const summary = {
      all: unreadCount,
      events: unreadByCategory.events || 0,
      invites: unreadByCategory.invites || 0,
      profile: unreadByCategory.profile || 0,
      system: unreadByCategory.system || 0,
    };

    res.json({ notifications, summary, unreadCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/unread-count', protect, async (req, res) => {
  try {
    const unreadDocs = await Notification.aggregate([
      { $match: { user: req.user._id, isRead: false } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const unreadByCategory = unreadDocs.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const unreadCount = unreadDocs.reduce((sum, item) => sum + item.count, 0);

    res.json({
      unreadCount,
      unreadByCategory: {
        all: unreadCount,
        events: unreadByCategory.events || 0,
        invites: unreadByCategory.invites || 0,
        profile: unreadByCategory.profile || 0,
        system: unreadByCategory.system || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/read-all', protect, async (req, res) => {
  try {
    const category = `${req.body.category || ''}`.trim();
    const filter = { user: req.user._id, isRead: false };
    if (category && category !== 'all' && CATEGORIES.includes(category)) {
      filter.category = category;
    }

    await Notification.updateMany(filter, {
      $set: { isRead: true, readAt: new Date() },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );

    if (!notification) return res.status(404).json({ message: 'Notification introuvable' });
    res.json({ notification });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
