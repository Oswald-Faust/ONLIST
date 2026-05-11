const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  influencer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  scores: {
    style: { type: Number, min: 0, max: 10, default: 5 },
    punctuality: { type: Number, min: 0, max: 10, default: 5 },
    attitude: { type: Number, min: 0, max: 10, default: 5 },
    content: { type: Number, min: 0, max: 10, default: 5 },
  },
  globalScore: { type: Number },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now },
});

reviewSchema.pre('save', function (next) {
  const { style, punctuality, attitude, content } = this.scores;
  this.globalScore = ((style + punctuality + attitude + content) / 4).toFixed(1);
  next();
});

module.exports = mongoose.model('Review', reviewSchema);
