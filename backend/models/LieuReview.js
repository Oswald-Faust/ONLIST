const mongoose = require('mongoose');

const lieuReviewSchema = new mongoose.Schema({
  influencer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lieu: { type: mongoose.Schema.Types.ObjectId, ref: 'Lieu', required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  scores: {
    ambience: { type: Number, min: 0, max: 10, default: 5 },
    service: { type: Number, min: 0, max: 10, default: 5 },
    value: { type: Number, min: 0, max: 10, default: 5 },
  },
  globalScore: { type: Number },
  comment: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
});

lieuReviewSchema.index({ influencer: 1, lieu: 1, event: 1 }, { unique: true, sparse: true });

lieuReviewSchema.pre('save', function (next) {
  const { ambience, service, value } = this.scores;
  this.globalScore = Math.round((((ambience + service + value) / 3) * 10)) / 10;
  next();
});

module.exports = mongoose.model('LieuReview', lieuReviewSchema);
