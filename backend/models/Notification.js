const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: [
      'event_invite',
      'application_received',
      'application_accepted',
      'application_rejected',
      'account_validated',
      'account_rejected',
      'system',
    ],
    required: true,
  },
  category: {
    type: String,
    enum: ['all', 'events', 'invites', 'profile', 'system'],
    default: 'all',
    index: true,
  },
  title: { type: String, required: true, trim: true },
  body: { type: String, required: true, trim: true },
  entityType: {
    type: String,
    enum: ['event', 'application', 'profile', 'system'],
    default: 'system',
  },
  entityId: { type: mongoose.Schema.Types.ObjectId },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  isRead: { type: Boolean, default: false, index: true },
  readAt: { type: Date },
  createdAt: { type: Date, default: Date.now, index: true },
});

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, category: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
