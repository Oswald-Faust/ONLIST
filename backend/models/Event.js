const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  images: [{ type: String }],

  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  venue: { type: String },
  address: { type: String },
  city: { type: String, required: true },
  country: { type: String, default: 'France' },

  category: {
    type: String,
    enum: ['restaurant', 'bar', 'club', 'spa', 'sport', 'wellness', 'premium', 'other'],
    default: 'other',
  },

  moment: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'night'],
    default: 'evening',
  },

  date: { type: Date, required: true },
  cutoffTime: { type: Date },

  maxParticipants: { type: Number, default: 10 },
  acceptedCount: { type: Number, default: 0 },

  offer: { type: String },
  requirements: { type: String },

  isSponsored: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Event', eventSchema);
