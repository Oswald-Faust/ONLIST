const cron = require('node-cron');
const { sendRenewalReminders } = require('../utils/subscriptionReminders');

// Fuseau horaire des tâches planifiées (Europe/Paris par défaut)
const TIMEZONE = process.env.CRON_TIMEZONE || 'Europe/Paris';

// Expression cron du rappel de renouvellement (par défaut : chaque jour à 10h00)
const RENEWAL_REMINDER_CRON = process.env.RENEWAL_REMINDER_CRON || '0 10 * * *';

function startSchedulers() {
  if (process.env.DISABLE_CRON === 'true') {
    console.log('⏸️  Tâches planifiées désactivées (DISABLE_CRON=true)');
    return;
  }

  if (!cron.validate(RENEWAL_REMINDER_CRON)) {
    console.error(`Expression cron invalide pour les rappels: ${RENEWAL_REMINDER_CRON}`);
    return;
  }

  cron.schedule(
    RENEWAL_REMINDER_CRON,
    async () => {
      try {
        await sendRenewalReminders();
      } catch (err) {
        console.error('[scheduler] Échec sendRenewalReminders:', err.message);
      }
    },
    { timezone: TIMEZONE }
  );

  console.log(`🕒 Rappels de renouvellement planifiés (${RENEWAL_REMINDER_CRON}, ${TIMEZONE})`);
}

module.exports = { startSchedulers };
