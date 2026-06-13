const User = require('../models/User');
const { getStripe, isStripeConfigured, getPlanLabel, formatStripeAmount } = require('./stripe');
const { createNotification } = require('./notifications');

// Nombre de jours avant l'échéance où l'on envoie le rappel de prélèvement
const REMINDER_DAYS_BEFORE = 2;

function formatFrenchDate(date) {
  try {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch (_) {
    return '';
  }
}

// Deux dates correspondent-elles à la même échéance (à la minute près) ?
function isSameDeadline(a, b) {
  if (!a || !b) return false;
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 60 * 1000;
}

// Récupère le montant du prochain prélèvement : aperçu de facture Stripe,
// avec repli sur le prix de l'abonnement si l'aperçu n'est pas disponible.
async function getUpcomingAmount(stripe, user, subscription) {
  try {
    const preview = await stripe.invoices.createPreview({
      customer: user.stripeCustomerId,
      subscription: user.stripeSubscriptionId,
    });
    if (preview?.amount_due != null) {
      return formatStripeAmount(preview.amount_due, preview.currency);
    }
  } catch (_) {
    // aperçu indisponible -> on tente le repli ci-dessous
  }

  const price = subscription?.items?.data?.[0]?.price;
  if (price?.unit_amount != null) {
    return formatStripeAmount(price.unit_amount, price.currency);
  }
  return '';
}

/**
 * Envoie un rappel aux abonnés Stripe dont le prélèvement mensuel tombe dans ~2 jours.
 * Idempotent : un rappel n'est envoyé qu'une fois par échéance (champ
 * `subscriptionRenewalReminderFor`). À tester en ligne de commande ou via le cron.
 */
async function sendRenewalReminders() {
  if (!isStripeConfigured()) {
    console.log('[renewal-reminders] Stripe non configuré, rappels ignorés');
    return { checked: 0, sent: 0 };
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_DAYS_BEFORE * 24 * 60 * 60 * 1000);

  // Candidats : abonnement Stripe actif dont l'échéance tombe dans la fenêtre [maintenant, +2j]
  const candidates = await User.find({
    subscriptionStore: 'stripe',
    subscriptionStatus: { $in: ['active', 'trialing'] },
    stripeSubscriptionId: { $nin: [null, ''] },
    subscriptionExpiresAt: { $gt: now, $lte: windowEnd },
  }).select(
    '_id subscriptionPlan subscriptionStatus subscriptionExpiresAt subscriptionRenewalReminderFor stripeCustomerId stripeSubscriptionId expoPushToken'
  );

  const stripe = getStripe();
  let sent = 0;

  for (const user of candidates) {
    try {
      // Anti-doublon : déjà rappelé pour cette même échéance
      if (isSameDeadline(user.subscriptionRenewalReminderFor, user.subscriptionExpiresAt)) {
        continue;
      }

      // Vérifie auprès de Stripe que l'abonnement va réellement se renouveler
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      if (
        !['active', 'trialing'].includes(subscription.status) ||
        subscription.cancel_at_period_end
      ) {
        continue; // pas de renouvellement prévu -> pas de rappel
      }

      const planLabel = getPlanLabel(user.subscriptionPlan);
      const renewalDate = formatFrenchDate(user.subscriptionExpiresAt);
      const amount = await getUpcomingAmount(stripe, user, subscription);

      await createNotification({
        userId: user._id,
        type: 'payment_upcoming',
        category: 'system',
        title: 'Prélèvement à venir',
        body: `Votre abonnement ${planLabel} sera renouvelé${renewalDate ? ` le ${renewalDate}` : ' dans 2 jours'}${amount ? ` (${amount})` : ''}.`,
        entityType: 'system',
        entityId: user._id,
        data: {
          plan: user.subscriptionPlan,
          planLabel,
          amount,
          renewalDate: user.subscriptionExpiresAt,
        },
      });

      // Marque l'échéance comme rappelée
      user.subscriptionRenewalReminderFor = user.subscriptionExpiresAt;
      await user.save();
      sent += 1;
    } catch (err) {
      console.error(`[renewal-reminders] Erreur pour user ${user._id}:`, err.message);
    }
  }

  console.log(`[renewal-reminders] ${candidates.length} candidat(s), ${sent} rappel(s) envoyé(s)`);
  return { checked: candidates.length, sent };
}

module.exports = { sendRenewalReminders, REMINDER_DAYS_BEFORE };
