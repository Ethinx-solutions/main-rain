import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Mail } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import AuthShell from '../components/AuthShell';

/** Request a password-reset link. The API always returns a generic response. */
const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await axios.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err) {
      setError('We could not process the request. Please try again shortly.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell title="Reset your password" subtitle="Enter your account email and we’ll send a secure reset link">
        <div className="auth-card">
          {submitted ? (
            <div className="text-center" data-testid="forgot-password-sent">
              <div className="flex justify-center">
                <Mail className="w-10 h-10 text-blue-600 dark:text-blue-300" />
              </div>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                If an account exists for that email, a password reset link has been sent. Check your inbox.
              </p>
              <Link
                to="/login"
                className="mt-6 inline-block w-full py-2 px-4 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={onSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your email"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400" data-testid="forgot-password-error">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? <LoadingSpinner size="sm" /> : 'Send reset link'}
              </button>
              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
    </AuthShell>
  );
};

export default ForgotPassword;
