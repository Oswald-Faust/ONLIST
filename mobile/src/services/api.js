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

const BASE_URL = normalizedEnvBaseUrl || fallbackBaseUrl;

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

export const adminAPI = {
  users: (params) => api.get('/admin/users', { params }),
  updateStatus: (id, status) => api.put(`/admin/users/${id}/status`, { status }),
  stats: () => api.get('/admin/stats'),
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
  get: (id) => api.get(`/lieux/${id}`),
  reviews: (id) => api.get(`/lieux/${id}/reviews`),
  review: (id, data) => api.post(`/lieux/${id}/review`, data),
  create: (data) => api.post('/lieux', data),
  update: (id, data) => api.put(`/lieux/${id}`, data),
  delete: (id) => api.delete(`/lieux/${id}`),
};

export const uploadAPI = {
  image: async (uri) => {
    const token = await AsyncStorage.getItem('token');
    const filename = uri.split('/').pop();
    const ext = (filename.split('.').pop() || 'jpg').toLowerCase();
    const type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const formData = new FormData();
    formData.append('file', { uri, name: filename, type });
    const response = await axios.post(`${BASE_URL}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};

export default api;
