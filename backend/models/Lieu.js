const mongoose = require('mongoose');

const lieuSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['restaurant', 'bar', 'club', 'spa', 'sport', 'wellness', 'premium', 'other'],
    required: true,
  },
  capacity: { type: Number, default: 0 },
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  postalCode: { type: String, trim: true },
  description: { type: String },
  photos: [{ type: String }],
  score: { type: Number, default: 0 },
  reviewsCount: { type: Number, default: 0 },
  scoreDetails: {
    ambience: { type: Number, default: 0 },
    service: { type: Number, default: 0 },
    value: { type: Number, default: 0 },
  },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Lieu', lieuSchema);
