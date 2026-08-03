const express = require('express');
const {
  mapEventTypeToStatus,
  resolveUserFromRevenueCatEvent,
  syncUserSubscriptionFromRevenueCat,
  validateRevenueCatWebhookAuth,
} = require('../utils/revenueCat');
const { createNotification } = require('../utils/notifications');
const { getPlanLabel } = require('../utils/stripe');

const router = express.Router();

// Événements qui n'affectent pas l'accès : on répond 200 sans rien changer,
// sinon RevenueCat considère la livraison en échec et rejoue indéfiniment.
const IGNORED_EVENT_TYPES = new Set([
  'TEST',
  'TRANSFER',
  'SUBSCRIBER_ALIAS',
  'SUBSCRIPTION_PAUSED',
  'INVOICE_ISSUANCE',
]);

// POST /api/subscriptions/revenuecat-webhook
// Configuré dans le dashboard RevenueCat (Integrations → Webhooks), protégé par
// l'en-tête Authorization défini dans REVENUECAT_WEBHOOK_AUTH.
router.post('/', async (req, res) => {
  if (!validateRevenueCatWebhookAuth(req)) {
    console.error('RevenueCat webhook: en-tête d’autorisation invalide');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const event = req.body?.event || {};
  const eventType = event.type || '';

  if (!eventType || IGNORED_EVENT_TYPES.has(eventType)) {
    return res.json({ received: true, ignored: true });
  }

  try {
    const { user, appUserId } = await resolveUserFromRevenueCatEvent(event);

    if (!user) {
      // Un abonné inconnu ne doit pas provoquer de réémission : on trace et on
      // acquitte. C'est le cas si l'achat vient d'un compte supprimé.
      console.warn(`RevenueCat webhook: aucun utilisateur pour app_user_id=${appUserId}`);
      return res.json({ received: true, matched: false });
    }

    const previousStatus = user.subscriptionStatus;

    // On ne fait pas confiance au payload : on réinterroge l'API RevenueCat,
    // qui reste la source de vérité sur l'état réel de l'abonnement.
    await syncUserSubscriptionFromRevenueCat(user, {
      appUserId,
      status: mapEventTypeToStatus(eventType),
      productId: event.product_id,
      store: event.store,
      entitlementId: event.entitlement_id,
      note: `Webhook RevenueCat : ${eventType}`,
    });

    // Notification uniquement sur les transitions qui demandent une action.
    const planLabel = getPlanLabel(user.subscriptionPlan);
    if (eventType === 'BILLING_ISSUE') {
      await createNotification({
        userId: user._id,
        type: 'payment_upcoming',
        category: 'system',
        title: 'Problème de paiement',
        body: 'Le renouvellement de votre abonnement a échoué. Vérifiez votre moyen de paiement dans les réglages de votre appareil.',
        entityType: 'system',
        entityId: user._id,
        data: { source: 'revenuecat', eventType },
      }).catch((err) => console.error('Notification billing issue:', err.message));
    } else if (previousStatus !== 'active' && user.subscriptionStatus === 'active') {
      await createNotification({
        userId: user._id,
        type: eventType === 'RENEWAL' ? 'payment_renewed' : 'payment_confirmed',
        category: 'system',
        title: 'Abonnement actif',
        body: `Votre abonnement ${planLabel} est désormais actif.`,
        entityType: 'system',
        entityId: user._id,
        data: { source: 'revenuecat', eventType, plan: user.subscriptionPlan },
      }).catch((err) => console.error('Notification subscription active:', err.message));
    }

    return res.json({ received: true, matched: true, status: user.subscriptionStatus });
  } catch (err) {
    console.error('RevenueCat webhook error:', err.message);
    // 500 : RevenueCat rejouera l'événement, ce qui est le comportement voulu
    // si la synchronisation a échoué pour une raison transitoire.
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
