const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  phone: { type: String, unique: true, sparse: true, trim: true },
  password: { type: String, select: false },

  // OAuth
  googleId: { type: String, unique: true, sparse: true },
  appleId: { type: String, unique: true, sparse: true },
  avatarUrl: { type: String },
  authProvider: { type: String, enum: ['email', 'google', 'apple'], default: 'email' },

  type: {
    type: String,
    enum: ['influencer', 'business', 'admin'],
    required: true,
    default: 'influencer',
  },
  status: {
    type: String,
    enum: ['pending', 'validated', 'rejected'],
    default: 'pending',
  },

  // Influencer fields
  photos: [{ type: String }],
  bio: { type: String },
  instagram: { type: String },
  tiktok: { type: String },
  youtube: { type: String },
  followersCount: { type: Number, default: 0 },
  city: { type: String },
  country: { type: String, default: 'France' },
  nationality: { type: String },
  gender: { type: String, enum: ['female', 'male', 'non-binary', ''] },
  dateOfBirth: { type: String }, // format DD/MM/YYYY
  selectedCity: { type: String, default: '' },
  expoPushToken: { type: String, default: '' },
  score: { type: Number, default: 0 },
  reviewsCount: { type: Number, default: 0 },
  scoreDetails: {
    punctuality: { type: Number, default: 0 },
    style:       { type: Number, default: 0 },
    attitude:    { type: Number, default: 0 },
    content:     { type: Number, default: 0 },
  },

  // Business fields
  businessName: { type: String },
  businessType: {
    type: String,
    enum: ['restaurant', 'bar', 'club', 'spa', 'sport', 'wellness', 'premium', 'other'],
  },
  businessAddress: { type: String },
  businessCity: { type: String },
  businessDescription: { type: String },
  businessLogo: { type: String },

  // Plasma = currency/points
  plasma: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
