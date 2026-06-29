// Applique un boost à un événement à partir d'une session Stripe Checkout payée.
// Idempotent : si la même session a déjà été appliquée (par le webhook ou par la
// confirmation directe côté app), on ne réapplique pas (pas de double comptage).
async function applyBoostFromSession(event, session) {
  if (!event || !session) return false;
  if (event.boostAppliedSessionId && String(event.boostAppliedSessionId) === String(session.id)) {
    return false;
  }
  const boostDays = Number(session.metadata?.boostDays || 0);
  if (!boostDays) return false;

  const amountPaid = Number(session.amount_total || 0) / 100;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + boostDays * 24 * 60 * 60 * 1000);

  event.isSponsored = true;
  event.isBoosted = true;
  event.boostDurationDays = boostDays;
  event.boostLastPaidAt = now;
  event.boostAmountPaid = amountPaid;
  event.boostExpiresAt = expiresAt;
  event.boostCheckoutSessionId = session.id;
  event.boostAppliedSessionId = session.id;
  event.boostCount = (event.boostCount || 0) + 1;
  event.boostTotalSpent = (event.boostTotalSpent || 0) + amountPaid;
  await event.save();
  return true;
}

module.exports = { applyBoostFromSession };
