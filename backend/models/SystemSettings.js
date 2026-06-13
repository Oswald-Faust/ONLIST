const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'global' },
  subscriptionBillingEnabled: { type: Boolean, default: false },
  foundingPartnerDiscountPercent: { type: Number, default: 30 },
  foundingPartnerGraceMonths: { type: Number, default: 3 },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
