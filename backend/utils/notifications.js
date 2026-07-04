const Notification = require('../models/Notification');
const User = require('../models/User');

const ENGLISH_PUSH_COPY = {
  account_validated: ['Account approved', 'Your ONLIST account is now active.'],
  account_rejected: ['Account declined', 'Your ONLIST account was declined. Contact support for more information.'],
  application_received: ['New application', 'A creator applied to your event.'],
  application_accepted: ['Application confirmed', 'Your application was accepted.'],
  application_reopened: ['Application reopened', 'Your application is pending again.'],
  application_rejected: ['Application declined', 'Your application was not selected.'],
  invitation_accepted: ['Invitation accepted', 'A creator accepted your event invitation.'],
  influencer_review_received: ['New rating received', 'A business rated your event participation.'],
  event_invite: ['New invitation', 'You received a new event invitation.'],
  deliverable_submitted: ['Deliverable received', 'A creator submitted a deliverable for your event.'],
  deliverable_flagged: ['Deliverable reported', 'A business reported a deliverable. Our team can step in if needed.'],
  deliverable_reminder: ['Deliverable reminder', 'You have 24 hours left to submit your deliverables.'],
  creator_banned: ['Account suspended', 'Two warnings were issued. Your creator account has been suspended.'],
  creator_warning: ['Official warning', 'No deliverable was received. This is an official warning.'],
  payment_confirmed: ['Payment confirmed', 'Your payment was received successfully.'],
  payment_renewed: ['Subscription renewed', 'Your subscription was renewed successfully. Thank you!'],
  payment_upcoming: ['Upcoming payment', 'Your subscription will renew soon.'],
  system: ['Incomplete profile', 'Complete the missing information to finish your profile.'],
};

async function sendExpoPushNotification({ token, title, body, data }) {
  if (!token) return;

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        sound: 'default',
        title,
        body,
        data,
      }),
    });
  } catch (error) {
    console.error('Expo push failed:', error.message);
  }
}

async function createNotification({
  userId,
  actorId,
  type,
  category,
  title,
  body,
  entityType = 'system',
  entityId,
  data = {},
}) {
  if (!userId || !title || !body || !type) return null;

  const notification = await Notification.create({
    user: userId,
    actor: actorId,
    type,
    category: category || 'all',
    title,
    body,
    entityType,
    entityId,
    data,
  });

  const recipient = await User.findById(userId).select('expoPushToken preferredLanguage');
  if (recipient?.expoPushToken) {
    const englishCopy = recipient.preferredLanguage === 'en' ? ENGLISH_PUSH_COPY[type] : null;
    await sendExpoPushNotification({
      token: recipient.expoPushToken,
      title: englishCopy?.[0] || title,
      body: englishCopy?.[1] || body,
      data: {
        notificationId: `${notification._id}`,
        entityType,
        entityId: entityId ? `${entityId}` : undefined,
        category,
        type,
        ...data,
      },
    });
  }

  return notification;
}

module.exports = { createNotification };
