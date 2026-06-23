const { createNotification } = require('./notifications');

const INFLUENCER_FIELDS = [
  { key: 'photos', label: 'tes photos' },
  { key: 'bio', label: 'ta bio' },
  { key: 'city', label: 'ta ville' },
  { key: 'gender', label: 'ton genre' },
  { key: 'dateOfBirth', label: 'ta date de naissance' },
  { key: 'instagram', label: 'ton Instagram' },
];

const BUSINESS_FIELDS = [
  { key: 'businessName', label: 'le nom de ton établissement' },
  { key: 'businessType', label: 'la catégorie de ton établissement' },
  { key: 'businessAddress', label: "l'adresse" },
  { key: 'businessCity', label: 'la ville' },
  { key: 'businessDescription', label: 'la description' },
  { key: 'businessLogo', label: 'le logo' },
];

function hasValue(user, key) {
  const value = user?.[key];
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return Boolean(value);
}

function getIncompleteProfileFields(user) {
  if (!user) return [];
  const fields = user.type === 'business' ? BUSINESS_FIELDS : INFLUENCER_FIELDS;
  return fields.filter((field) => !hasValue(user, field.key));
}

async function sendIncompleteProfileNotification(user) {
  const missingFields = getIncompleteProfileFields(user);
  if (missingFields.length === 0) return null;

  const labels = missingFields.map((field) => field.label);
  const preview = labels.slice(0, 3).join(', ');
  const extraCount = Math.max(0, labels.length - 3);
  const suffix = extraCount > 0 ? ` et ${extraCount} autre${extraCount > 1 ? 's' : ''}` : '';

  return createNotification({
    userId: user._id,
    type: 'system',
    category: 'profile',
    title: 'Profil incomplet',
    body: `Complète ${preview}${suffix} pour finaliser ton profil.`,
    entityType: 'profile',
    entityId: user._id,
    data: {
      missingFields: missingFields.map((field) => field.key),
      missingCount: missingFields.length,
    },
  });
}

module.exports = {
  getIncompleteProfileFields,
  sendIncompleteProfileNotification,
};
