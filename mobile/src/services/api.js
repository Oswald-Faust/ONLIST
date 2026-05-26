import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// En dev: l'émulateur Android utilise 10.0.2.2, iOS utilise localhost
const BASE_URL = Platform.select({
  android: 'http://10.0.2.2:4000/api',
  ios: 'http://localhost:4000/api',
  default: 'http://localhost:4000/api',
});

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

export default api;
