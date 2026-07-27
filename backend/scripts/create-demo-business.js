require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');

const DEMO_EMAIL = process.env.DEMO_BUSINESS_EMAIL || 'apple-review-business@onlist.club';
const DEMO_PASSWORD = process.env.DEMO_BUSINESS_PASSWORD || 'OnlistAppleReview2026!';
const DEMO_NAME = process.env.DEMO_BUSINESS_NAME || 'Apple Review Business';

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing. Add it to backend/.env or export it before running this script.');
  }

  await mongoose.connect(process.env.MONGO_URI);

  const normalizedEmail = DEMO_EMAIL.trim().toLowerCase();
  let user = await User.findOne({ email: normalizedEmail }).select('+password');
  const now = new Date();

  if (!user) {
    user = new User({
      email: normalizedEmail,
      createdAt: now,
    });
  }

  user.name = DEMO_NAME;
  user.password = DEMO_PASSWORD;
  user.type = 'business';
  user.status = 'validated';
  user.authProvider = 'email';
  user.preferredLanguage = 'fr';

  user.businessName = process.env.DEMO_BUSINESS_COMPANY || 'ONLIST Review Club';
  user.businessType = process.env.DEMO_BUSINESS_TYPE || 'restaurant';
  user.businessAddress = process.env.DEMO_BUSINESS_ADDRESS || '10 rue de la Paix, 75002 Paris';
  user.businessCity = process.env.DEMO_BUSINESS_CITY || 'Paris';
  user.businessDescription = process.env.DEMO_BUSINESS_DESCRIPTION || 'Compte demo Etablissement pour la revue App Store.';

  user.subscriptionPlan = process.env.DEMO_BUSINESS_PLAN || 'group';
  user.subscriptionStatus = 'active';
  user.subscriptionStore = 'manual';
  user.subscriptionProductId = 'app-review-demo';
  user.subscriptionUpdatedAt = now;
  user.subscriptionExpiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  user.isFoundingPartner = true;
  user.foundingPartnerGrantedAt = user.foundingPartnerGrantedAt || now;

  user.subscriptionHistory = Array.isArray(user.subscriptionHistory) ? user.subscriptionHistory : [];
  user.subscriptionHistory.unshift({
    action: 'manual_update',
    source: 'admin',
    plan: user.subscriptionPlan,
    status: user.subscriptionStatus,
    productId: user.subscriptionProductId,
    store: user.subscriptionStore,
    expiresAt: user.subscriptionExpiresAt,
    note: 'Compte demo Etablissement pour App Review Apple',
    createdAt: now,
  });
  user.subscriptionHistory = user.subscriptionHistory.slice(0, 50);

  await user.save();

  console.log('Demo business account ready');
  console.log(`Email: ${normalizedEmail}`);
  console.log(`Password: ${DEMO_PASSWORD}`);
  console.log(`Type: ${user.type}`);
  console.log(`Status: ${user.status}`);
  console.log(`Subscription: ${user.subscriptionPlan} / ${user.subscriptionStatus}`);
  console.log(`Expires: ${user.subscriptionExpiresAt.toISOString()}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
