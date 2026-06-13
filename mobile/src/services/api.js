import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const envBaseUrl = process.env.EXPO_PUBLIC_API_URL;
const normalizedEnvBaseUrl = envBaseUrl
  ? envBaseUrl.replace(/\/$/, '')
  : null;

// En dev: l'émulateur Android utilise 10.0.2.2, iOS utilise localhost.
// En build EAS, EXPO_PUBLIC_API_URL doit pointer vers l'API publique.
const fallbackBaseUrl = Platform.select({
  android: 'http://10.0.2.2:4000/api',
  ios: 'http://localhost:4000/api',
  default: 'http://localhost:4000/api',
});

export const BASE_URL = normalizedEnvBaseUrl || fallbackBaseUrl;

const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.message || 'Erreur réseau';
    return Promise.reject(new Error(message));
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  googleOAuth: (accessToken) => api.post('/auth/google', { accessToken }),
  appleOAuth: (identityToken, fullName, email) => api.post('/auth/apple', { identityToken, fullName, email }),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  verifyResetCode: (data) => api.post('/auth/verify-reset-code', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

export const eventsAPI = {
  list: (params) => api.get('/events', { params }),
  get: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  myEvents: () => api.get('/events/business/mine'),
};

export const applicationsAPI = {
  apply: (data) => api.post('/applications', data),
  myApplications: (params) => api.get('/applications/my', { params }),
  eventApplications: (eventId) => api.get(`/applications/event/${eventId}`),
  respond: (id, status) => api.put(`/applications/${id}`, { status }),
  invite: (data) => api.post('/applications/invite', data),
  businessPending: (params) => api.get('/applications/business/pending', { params }),
};

export const deliverablesAPI = {
  mine: () => api.get('/deliverables/my'),
  submit: (data) => api.post('/deliverables/submit', data),
  flag: (id, data) => api.post(`/deliverables/${id}/flag`, data),
};

export const usersAPI = {
  list: (params) => api.get('/users', { params }),
  get: (id) => api.get(`/users/${id}`),
  updateMe: (data) => api.put('/users/me', data),
  updatePushToken: (data) => api.put('/users/me/push-token', data),
  myScore: () => api.get('/users/me/score'),
  changePassword: (data) => api.put('/users/me/password', data),
  deleteAccount: () => api.delete('/users/me'),
  review: (id, data) => api.post(`/users/${id}/review`, data),
};

export const subscriptionsAPI = {
  status: () => api.get('/subscriptions/me'),
  checkout: (plan) => api.post('/subscriptions/checkout', { plan }),
  portal: () => api.post('/subscriptions/portal'),
};

export const adminAPI = {
  users: (params) => api.get('/admin/users', { params }),
  subscriptions: () => api.get('/admin/subscriptions'),
  updateStatus: (id, status) => api.put(`/admin/users/${id}/status`, { status }),
  updateFoundingPartner: (id, isFoundingPartner) => api.patch(`/admin/users/${id}/founding-partner`, { isFoundingPartner }),
  stats: () => api.get('/admin/stats'),
  settings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.patch('/admin/settings', data),
  deliverables: () => api.get('/admin/deliverables'),
  events: (params) => api.get('/admin/events', { params }),
  createEvent: (data) => api.post('/admin/events', data),
  updateEvent: (id, data) => api.put(`/admin/events/${id}`, data),
  deleteEvent: (id) => api.delete(`/admin/events/${id}`),
};

export const metaAPI = {
  countries: () => api.get('/meta/countries'),
  cities: (params) => api.get('/meta/cities', { params }),
  eventCities: () => api.get('/meta/event-cities'),
};

export const notificationsAPI = {
  list: (params) => api.get('/notifications', { params }),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: (category) => api.patch('/notifications/read-all', category ? { category } : {}),
};

export const lieuxAPI = {
  mine: () => api.get('/lieux/mine'),
  prefillFirst: () => api.get('/lieux/prefill/first'),
  get: (id) => api.get(`/lieux/${id}`),
  reviews: (id) => api.get(`/lieux/${id}/reviews`),
  review: (id, data) => api.post(`/lieux/${id}/review`, data),
  create: (data) => api.post('/lieux', data),
  update: (id, data) => api.put(`/lieux/${id}`, data),
  delete: (id) => api.delete(`/lieux/${id}`),
};

// Détermine le nom de fichier et le MIME type d'une image à envoyer.
// On privilégie le mimeType fourni par expo-image-picker (asset.mimeType) :
// l'URI iOS n'a pas toujours d'extension fiable (photos HEIC notamment).
const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

function resolveImageMeta(uri, mimeType, fileName) {
  const uriName = (uri.split('/').pop() || '').split('?')[0];
  let type = mimeType;
  if (!type) {
    const ext = (uriName.split('.').pop() || 'jpg').toLowerCase();
    type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  }
  const ext = MIME_TO_EXT[type] || 'jpg';
  // On garantit un nom avec une extension cohérente avec le MIME type.
  const base = fileName || uriName || `photo.${ext}`;
  const name = /\.[a-z0-9]+$/i.test(base) ? base : `${base}.${ext}`;
  return { name, type };
}

export const uploadAPI = {
  image: async (uri, options = {}) => {
    const { onProgress, isPublic = false, mimeType, fileName } = options;
    const token = await AsyncStorage.getItem('token');
    const { name, type } = resolveImageMeta(uri, mimeType, fileName);
    const formData = new FormData();
    formData.append('file', { uri, name, type });
    const headers = { 'Content-Type': 'multipart/form-data' };
    if (!isPublic && token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await axios.post(`${BASE_URL}/upload`, formData, {
      headers,
      onUploadProgress: (event) => {
        if (!onProgress || !event?.total) return;
        onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      },
    });
    return response.data;
  },
  publicImage: async (uri, options = {}) => {
    const { onProgress, mimeType, fileName } = options;
    const { name, type } = resolveImageMeta(uri, mimeType, fileName);
    const formData = new FormData();
    formData.append('file', { uri, name, type });
    const response = await axios.post(`${BASE_URL}/upload/public`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (!onProgress || !event?.total) return;
        onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      },
    });
    return response.data;
  },
};

export default api;
