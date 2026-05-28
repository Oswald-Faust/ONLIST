const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  images: [{ type: String }],

  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lieu: { type: mongoose.Schema.Types.ObjectId, ref: 'Lieu' },

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
  startTime: { type: String },
  endTime: { type: String },
  cutoffTime: { type: Date },

  dresscode: { type: String },
  ageRequirement: { type: Number, default: 18 },
  guestsRequired: { type: Number, default: 0 },
  repeats: { type: String, enum: ['none', 'daily', 'weekly', 'monthly'], default: 'none' },

  maxParticipants: { type: Number, default: 10 },
  acceptedCount: { type: Number, default: 0 },
  minFollowers: { type: Number, default: 0 },
  genderRequirement: { type: String, enum: ['any', 'female', 'male', 'mixed'], default: 'any' },

  offer: { type: String },
  offerItems: [{ type: String }],
  deliverables: [{ type: String }],
  accountsToMention: [{ type: String }],
  tags: [{ type: String }],
  rules: { type: String },

  isSponsored: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isFull: { type: Boolean, default: false },
  isLive: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Event', eventSchema);
