const express = require('express');
const { protect } = require('../middleware/auth');
const {
  mapEventTypeToStatus,
  resolveUserFromRevenueCatEvent,
  syncUserSubscriptionFromRevenueCat,
  validateRevenueCatWebhookAuth,
} = require('../utils/revenueCat');

const router = express.Router();

router.get('/me', protect, async (req, res) => {
  try {
    res.json({
      subscriptionPlan: req.user.subscriptionPlan || 'starter',
      subscriptionStatus: req.user.subscriptionStatus || 'inactive',
      subscriptionProductId: req.user.subscriptionProductId || '',
      subscriptionStore: req.user.subscriptionStore || '',
      subscriptionExpiresAt: req.user.subscriptionExpiresAt || null,
      revenueCatCustomerId: req.user.revenueCatCustomerId || '',
      updatedAt: req.user.subscriptionUpdatedAt || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/sync', protect, async (req, res) => {
  try {
    const user = await syncUserSubscriptionFromRevenueCat(req.user, {
      appUserId: req.user.revenueCatCustomerId || String(req.user._id),
    });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    if (!validateRevenueCatWebhookAuth(req)) {
      return res.status(401).json({ message: 'Webhook RevenueCat non autorisé' });
    }

    const event = req.body?.event || req.body || {};
    if (event.type === 'TEST') {
      return res.status(200).json({ received: true, test: true });
    }

    const { user, appUserId } = await resolveUserFromRevenueCatEvent(event);
    if (!user) {
      return res.status(200).json({ received: true, skipped: 'user_not_found' });
    }

    await syncUserSubscriptionFromRevenueCat(user, {
      appUserId,
      status: mapEventTypeToStatus(event.type),
      productId: event.product_id,
      store: event.store,
      entitlementId: Array.isArray(event.entitlement_ids) ? event.entitlement_ids[0] : event.entitlement_id,
    });

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('RevenueCat webhook error:', err.message);
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
