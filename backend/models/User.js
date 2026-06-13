const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const subscriptionHistorySchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['created', 'manual_update', 'revenuecat_sync', 'founding_partner_granted', 'founding_partner_revoked'],
    required: true,
  },
  source: {
    type: String,
    enum: ['admin', 'revenuecat', 'system'],
    default: 'system',
  },
  plan: {
    type: String,
    enum: ['starter', 'pro', 'group'],
  },
  status: {
    type: String,
    enum: ['inactive', 'trialing', 'active', 'past_due', 'cancelled', 'grace'],
  },
  productId: { type: String, trim: true },
  store: { type: String, trim: true },
  expiresAt: { type: Date },
  note: { type: String, trim: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorName: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

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
  warningCount: { type: Number, default: 0 },
  bannedAt: { type: Date },

  // Business fields
  businessName: { type: String },
  businessType: {
    type: String,
    enum: ['restaurant', 'bar', 'club', 'spa', 'sport', 'wellness', 'hotel', 'cafe', 'beauty', 'shop', 'premium', 'other'],
  },
  businessAddress: { type: String },
  businessCity: { type: String },
  businessPostalCode: { type: String },
  businessDescription: { type: String },
  businessLogo: { type: String },
  businessBannerPhoto: { type: String },
  isFoundingPartner: { type: Boolean, default: false },
  foundingPartnerGrantedAt: { type: Date },
  subscriptionPlan: {
    type: String,
    enum: ['starter', 'pro', 'group'],
    default: 'starter',
  },
  subscriptionStatus: {
    type: String,
    enum: ['inactive', 'trialing', 'active', 'past_due', 'cancelled', 'grace'],
    default: 'inactive',
  },
  revenueCatCustomerId: { type: String, trim: true },
  revenueCatEntitlement: { type: String, trim: true },
  stripeCustomerId: { type: String, trim: true, index: true },
  stripeSubscriptionId: { type: String, trim: true },
  subscriptionProductId: { type: String, trim: true },
  subscriptionStore: { type: String, trim: true },
  subscriptionExpiresAt: { type: Date },
  subscriptionUpdatedAt: { type: Date },
  subscriptionHistory: { type: [subscriptionHistorySchema], default: [] },

  // Plasma = currency/points
  plasma: { type: Number, default: 0 },

  // Réinitialisation de mot de passe
  resetCode: { type: String, select: false },
  resetCodeExpiry: { type: Date, select: false },
  resetToken: { type: String, select: false },
  resetTokenExpiry: { type: Date, select: false },

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
