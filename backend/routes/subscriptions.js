const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getStripe,
  isStripeConfigured,
  getPriceIdForPlan,
  getAppUrls,
} = require('../utils/stripe');
const { getOrCreateStripeCustomer } = require('../utils/stripeSubscription');
const { BUSINESS_PLAN_KEYS } = require('../utils/businessPlans');
const SystemSettings = require('../models/SystemSettings');

const router = express.Router();

const VALID_PLANS = Object.values(BUSINESS_PLAN_KEYS);

router.get('/me', protect, async (req, res) => {
  try {
    const settings = await SystemSettings.findOne({ key: 'global' }).lean();
    // Mode payant: OFF (défaut) = tout gratuit, l'écran d'abonnement n'est pas affiché côté app.
    const billingEnabled = settings?.subscriptionBillingEnabled === true;
    res.json({
      subscriptionPlan: req.user.subscriptionPlan || 'starter',
      subscriptionStatus: req.user.subscriptionStatus || 'inactive',
      isFoundingPartner: Boolean(req.user.isFoundingPartner),
      subscriptionProductId: req.user.subscriptionProductId || '',
      subscriptionStore: req.user.subscriptionStore || '',
      subscriptionExpiresAt: req.user.subscriptionExpiresAt || null,
      stripeCustomerId: req.user.stripeCustomerId || '',
      hasActiveStripeSubscription: Boolean(req.user.stripeSubscriptionId),
      billingEnabled,
      updatedAt: req.user.subscriptionUpdatedAt || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Crée une session Stripe Checkout pour souscrire/changer de plan
router.post('/checkout', protect, async (req, res) => {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({ message: 'Paiement Stripe non configuré sur le serveur.' });
    }

    const plan = String(req.body?.plan || '').toLowerCase();
    if (!VALID_PLANS.includes(plan)) {
      return res.status(400).json({ message: 'Plan invalide.' });
    }

    const priceId = getPriceIdForPlan(plan);
    if (!priceId) {
      return res.status(400).json({ message: `Aucun tarif Stripe configuré pour le plan ${plan}.` });
    }

    const stripe = getStripe();
    const customerId = await getOrCreateStripeCustomer(req.user);
    const urls = getAppUrls();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: String(req.user._id),
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { userId: String(req.user._id), plan },
      },
      metadata: { userId: String(req.user._id), plan },
      success_url: urls.success,
      cancel_url: urls.cancel,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// Crée une session Customer Portal pour gérer/annuler/changer l'abonnement
router.post('/portal', protect, async (req, res) => {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({ message: 'Paiement Stripe non configuré sur le serveur.' });
    }
    if (!req.user.stripeCustomerId) {
      return res.status(400).json({ message: 'Aucun client Stripe associé à ce compte.' });
    }

    const stripe = getStripe();
    const urls = getAppUrls();
    const session = await stripe.billingPortal.sessions.create({
      customer: req.user.stripeCustomerId,
      return_url: urls.portalReturn,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe portal error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

router.get('/billing-history', protect, async (req, res) => {
  try {
    if (!isStripeConfigured()) {
      return res.json({ invoices: [], stripeConfigured: false });
    }
    if (!req.user.stripeCustomerId) {
      return res.json({ invoices: [], stripeConfigured: true });
    }

    const stripe = getStripe();
    const invoices = await stripe.invoices.list({
      customer: req.user.stripeCustomerId,
      limit: 50,
    });

    const normalized = (invoices.data || []).map((invoice) => ({
      id: invoice.id,
      number: invoice.number || invoice.id,
      status: invoice.status,
      amountPaid: invoice.amount_paid || 0,
      amountDue: invoice.amount_due || 0,
      currency: invoice.currency || 'eur',
      createdAt: invoice.created ? new Date(invoice.created * 1000).toISOString() : null,
      hostedInvoiceUrl: invoice.hosted_invoice_url || null,
      invoicePdf: invoice.invoice_pdf || null,
      description: invoice.description || '',
      billingReason: invoice.billing_reason || '',
      subscriptionId: typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id || null,
      lines: (invoice.lines?.data || []).map((line) => ({
        id: line.id,
        description: line.description || '',
        amount: line.amount || 0,
        currency: line.currency || invoice.currency || 'eur',
      })),
    }));

    res.json({ invoices: normalized, stripeConfigured: true });
  } catch (err) {
    console.error('Stripe billing history error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
