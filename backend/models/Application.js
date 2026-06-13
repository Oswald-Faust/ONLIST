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
  // Présence confirmée par l'influenceur (après acceptation par le business)
  confirmed: { type: Boolean, default: false },
  confirmedAt: { type: Date },
  reminderSentAt: { type: Date },
  warningIssuedAt: { type: Date },

  // Access pass (QR) : code unique encodé dans le QR de l'influenceur, validé par le business au check-in
  accessCode: { type: String, index: true },
  accessCodeShort: { type: String }, // code court lisible (fallback "Get Code")
  // Contrôle d'accès à l'entrée (scan QR par le business)
  checkedIn: { type: Boolean, default: false },
  checkedInAt: { type: Date },
});

applicationSchema.index({ user: 1, event: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
