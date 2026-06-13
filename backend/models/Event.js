const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  // 'draft' = brouillon (création non terminée, visible uniquement par le créateur)
  // 'published' = publié (visible par les influenceurs si isActive)
  status: { type: String, enum: ['draft', 'published'], default: 'published' },
  // Champs requis uniquement pour publier (validés dans la route), pas pour un brouillon
  title: { type: String, trim: true },
  description: { type: String },
  images: [{ type: String }],

  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lieu: { type: mongoose.Schema.Types.ObjectId, ref: 'Lieu' },

  venue: { type: String },
  address: { type: String },
  city: { type: String },
  country: { type: String, default: 'France' },

  category: {
    type: String,
    enum: [
      'gastronomie', 'restaurant', 'lounge', 'bar', 'club', 'bien_etre_spa', 'fitness', 'staycation', 'experiences', 'vip',
      'spa', 'sport', 'wellness', 'hotel', 'cafe', 'beauty', 'shop', 'premium', 'other',
    ],
    default: 'other',
  },

  moment: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'night'],
    default: 'evening',
  },

  date: { type: Date },
  startTime: { type: String },
  endTime: { type: String },
  requiredArrivalTime: { type: String },
  minimumPresenceDuration: { type: Number, default: 0 },
  cutoffTime: { type: Date },
  applicationCutoffOffsetHours: { type: Number, enum: [1, 2, 3, 4], default: 3 },

  dresscode: { type: String },
  ageRequirement: { type: Number, default: 18 },
  isAdultsOnly: { type: Boolean, default: false },
  plusOneMode: { type: String, enum: ['solo', 'plus_one_required'], default: 'solo' },
  guestsRequired: { type: Number, default: 0 },
  repeats: { type: String, enum: ['none', 'daily', 'weekly', 'monthly'], default: 'none' },

  maxParticipants: { type: Number, default: 10 },
  acceptedCount: { type: Number, default: 0 },
  minFollowers: { type: Number, default: 0 },
  genderRequirement: { type: String, enum: ['any', 'female', 'male', 'mixed'], default: 'any' },

  offer: { type: String },
  offerItems: [{ type: String }],
  deliverables: [{ type: String }],
  otherOffer: { type: String },
  otherDeliverable: { type: String },
  accountsToMention: [{ type: String }],
  tags: [{ type: String }],
  rules: { type: String },

  isSponsored: { type: Boolean, default: false },
  isBoosted: { type: Boolean, default: false },
  boostDurationDays: { type: Number, enum: [1, 3, 7, 14] },
  boostExpiresAt: { type: Date },
  isActive: { type: Boolean, default: true },
  isFull: { type: Boolean, default: false },
  isLive: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Event', eventSchema);
