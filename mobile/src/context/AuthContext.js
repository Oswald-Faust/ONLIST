import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, usersAPI } from '../services/api';
import { registerForPushNotificationsAsync } from '../services/pushNotifications';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (!user || !token) return;
    syncPushToken();
  }, [user?._id, token]);

  const restoreSession = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('token');
      const savedUser = await AsyncStorage.getItem('user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    const data = await authAPI.login(credentials);
    await AsyncStorage.setItem('token', data.token);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (userData) => {
    const data = await authAPI.register(userData);
    await AsyncStorage.setItem('token', data.token);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const loginWithGoogle = async (accessToken) => {
    const data = await authAPI.googleOAuth(accessToken);
    await AsyncStorage.setItem('token', data.token);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const loginWithApple = async (identityToken, fullName, email) => {
    const data = await authAPI.appleOAuth(identityToken, fullName, email);
    await AsyncStorage.setItem('token', data.token);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['token', 'user']);
    setToken(null);
    setUser(null);
  };

  const updateUser = async (updated) => {
    const merged = { ...user, ...updated };
    await AsyncStorage.setItem('user', JSON.stringify(merged));
    setUser(merged);
  };

  const syncPushToken = async () => {
    try {
      const expoPushToken = await registerForPushNotificationsAsync();
      if (!expoPushToken || expoPushToken === user?.expoPushToken) return;

      const data = await usersAPI.updatePushToken({ expoPushToken });
      const nextUser = data?.user || { ...user, expoPushToken };
      await AsyncStorage.setItem('user', JSON.stringify(nextUser));
      setUser(nextUser);
    } catch (error) {
      console.log('Push token sync error:', error.message);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser, loginWithGoogle, loginWithApple }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
