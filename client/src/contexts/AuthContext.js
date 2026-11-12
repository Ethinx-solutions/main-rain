import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Configure axios defaults
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Request interceptor to add auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          // Verify token is still valid
          const response = await axios.get('/auth/me');
          setUser(response.data.user);
        } catch (error) {
          // Token is invalid, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post('/auth/login', { email, password });
      const { token, user: userData } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      toast.success('Welcome back!');
      return { success: true };
    } catch (error) {
      const data = error.response?.data || {};
      const message = data.message || 'Login failed';
      toast.error(message);
      return {
        success: false,
        error: message,
        requiresVerification: Boolean(data.requiresVerification),
        email,
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await axios.post('/auth/register', { name, email, password });
      const { requiresVerification, emailSent } = response.data;

      // Registration no longer issues a session token: the account must be
      // activated via the emailed verification link first.
      return {
        success: true,
        requiresVerification: requiresVerification !== false,
        emailSent: Boolean(emailSent),
      };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const resendVerification = async (email) => {
    try {
      const response = await axios.post('/auth/resend-verification', { email });
      if (response.data.emailSent) {
        toast.success('Verification email sent - check your inbox');
      } else {
        toast.error('Could not send the verification email. Please try again later.');
      }
      return response.data;
    } catch (error) {
      toast.error('Could not send the verification email');
      return null;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out successfully');
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const updatePreferences = async (preferences) => {
    try {
      const response = await axios.put('/auth/preferences', preferences);
      const updatedUser = { ...user, preferences: response.data.preferences };
      updateUser(updatedUser);
      toast.success('Preferences updated successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update preferences';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const forgotPassword = async (email) => {
    try {
      await axios.post('/auth/forgot-password', { email });
      toast.success('Password reset email sent');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send reset email';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const resetPassword = async (token, password) => {
    try {
      await axios.post('/auth/reset-password', { token, password });
      toast.success('Password reset successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to reset password';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    resendVerification,
    logout,
    updateUser,
    updatePreferences,
    forgotPassword,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;