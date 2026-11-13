import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Lock, CheckCircle } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import AuthShell from '../components/AuthShell';

/** Handles the /reset-password?token=... link from the password-reset email. */
const ResetPassword = () => {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(token ? '' : 'This reset link is incomplete. Please use the link from your email.');

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      await axios.post('/auth/reset-password', { token, password });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'We could not reset your password. The link may be invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell title="Choose a new password" subtitle="Create a secure password for your EthinX workspace">
        <div className="auth-card">
          {success ? (
            <div className="text-center" data-testid="reset-password-success">
              <div className="flex justify-center">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                Your password has been reset. You can now sign in with your new password.
              </p>
              <Link
                to="/login"
                className="mt-6 inline-block w-full py-2 px-4 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Go to sign in
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={onSubmit}>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter a new password"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Confirm your new password"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400" data-testid="reset-password-error">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={isLoading || !token}
                className="w-full flex justify-center py-2 px-4 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? <LoadingSpinner size="sm" /> : 'Reset password'}
              </button>
            </form>
          )}
        </div>
    </AuthShell>
  );
};

export default ResetPassword;
