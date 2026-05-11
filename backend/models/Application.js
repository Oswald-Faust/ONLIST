const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },
  isInvitation: { type: Boolean, default: false },
  message: { type: String },
  appliedAt: { type: Date, default: Date.now },
  respondedAt: { type: Date },
});

applicationSchema.index({ user: 1, event: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
