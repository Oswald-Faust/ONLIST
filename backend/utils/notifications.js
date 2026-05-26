const Notification = require('../models/Notification');
const User = require('../models/User');

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

  const recipient = await User.findById(userId).select('expoPushToken');
  if (recipient?.expoPushToken) {
    await sendExpoPushNotification({
      token: recipient.expoPushToken,
      title,
      body,
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
