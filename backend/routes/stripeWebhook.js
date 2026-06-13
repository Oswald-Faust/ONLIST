const express = require('express');
const { getStripe } = require('../utils/stripe');
const {
  resolveUserFromStripe,
  applyStripeSubscriptionToUser,
  markStripeSubscriptionEnded,
} = require('../utils/stripeSubscription');

const router = express.Router();

// IMPORTANT: cette route est montée avec express.raw() AVANT express.json() dans server.js
// pour que la vérification de signature Stripe fonctionne sur le body brut.
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } else {
      // Pas de secret configuré (dev) : on parse sans vérifier la signature
      event = JSON.parse(req.body.toString('utf8'));
    }
  } catch (err) {
    console.error('Stripe webhook signature error:', err.message);
    return res.status(400).json({ message: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          const user = await resolveUserFromStripe({
            userId: session.metadata?.userId || session.client_reference_id,
            stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
            stripeSubscriptionId: subscription.id,
          });
          if (user) {
            await applyStripeSubscriptionToUser(user, subscription, {
              action: 'stripe_checkout_completed',
              note: 'Paiement Stripe Checkout finalisé',
            });
          }
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const user = await resolveUserFromStripe({
          userId: subscription.metadata?.userId,
          stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
          stripeSubscriptionId: subscription.id,
        });
        if (user) {
          await applyStripeSubscriptionToUser(user, subscription, {
            action: `stripe_${event.type.split('.').pop()}`,
            note: `Subscription Stripe ${event.type}`,
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const user = await resolveUserFromStripe({
          userId: subscription.metadata?.userId,
          stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
          stripeSubscriptionId: subscription.id,
        });
        if (user) {
          await markStripeSubscriptionEnded(user, subscription);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          const user = await resolveUserFromStripe({
            stripeCustomerId: typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id,
            stripeSubscriptionId: subscription.id,
          });
          if (user) {
            await applyStripeSubscriptionToUser(user, subscription, {
              action: 'stripe_payment_failed',
              note: 'Échec de paiement Stripe',
            });
          }
        }
        break;
      }

      default:
        // événement non géré : on accuse réception sans rien faire
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Stripe webhook handler error:', err.message);
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
