// context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const SERVER_IP = '192.168.65.11';
  const BASE_URL = `http://${SERVER_IP}:3000/api`;

  // Create axios instance
  const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
  });

  // Add token to requests automatically
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use(
      (config) => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
    };
  }, [token]);

  useEffect(() => {
    checkExistingLogin();
  }, []);

  const checkExistingLogin = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('userToken');
      
      if (storedToken) {
        try {
          const response = await api.post('/auth/verify', { token: storedToken });
          const data = response.data;

          if (data.valid) {
            setToken(storedToken);
            setUser(data.user);
          } else {
            await AsyncStorage.removeItem('userToken');
          }
        } catch (error) {
          await AsyncStorage.removeItem('userToken');
        }
      }
    } catch (error) {
      console.error('Error checking existing login:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', {
        username: username.trim(),
        password: password,
      });

      const data = response.data;

      if (data.success && data.token) {
        await AsyncStorage.setItem('userToken', data.token);
        setToken(data.token);
        setUser(data.user);
        return { success: true, data };
      } else {
        return { success: false, error: data.message || 'Login failed' };
      }
    } catch (error) {
      if (error.response) {
        return { success: false, error: error.response.data.message || 'Login failed' };
      } else if (error.request) {
        return { success: false, error: 'Network error. Please try again.' };
      } else {
        return { success: false, error: 'An unexpected error occurred' };
      }
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const value = {
    user,
    token,
    login,
    logout,
    loading,
    isAuthenticated: !!token && !!user,
    api, // Export axios instance for components to use
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};