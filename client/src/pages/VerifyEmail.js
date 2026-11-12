import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Brain, CheckCircle, XCircle, Mail } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * Handles the /verify-email?token=... link sent in the verification email.
 * Submits the token exactly once and reports the outcome to the user.
 * Without this page the catch-all route silently redirected to /login,
 * leaving the account unverified (login then returned 403).
 */
const VerifyEmail = () => {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token');
  const requested = useRef(false);
  const [status, setStatus] = useState(token ? 'verifying' : 'error');
  const [message, setMessage] = useState(
    token ? '' : 'This verification link is incomplete. Please use the link from your email.'
  );

  useEffect(() => {
    if (!token || requested.current) return;
    requested.current = true;
    axios
      .post('/auth/verify-email', { token })
      .then(() => {
        setStatus('success');
        setMessage('Your email has been verified. You can now sign in.');
      })
      .catch((error) => {
        setStatus('error');
        setMessage(
          error.response?.data?.message ||
            'We could not verify your email. The link may be invalid or expired.'
        );
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full">
              <Brain className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            Email verification
          </h2>
        </div>

        <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 text-center">
          <div className="flex justify-center" data-testid="verify-status-icon">
            {status === 'verifying' && <Mail className="w-10 h-10 text-blue-600 dark:text-blue-300" />}
            {status === 'success' && <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />}
            {status === 'error' && <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />}
          </div>

          {status === 'verifying' && (
            <div className="mt-6 flex flex-col items-center" data-testid="verify-progress">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Verifying your email…</p>
            </div>
          )}

          {status !== 'verifying' && (
            <>
              <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-white" data-testid="verify-result-title">
                {status === 'success' ? 'Email verified' : 'Verification failed'}
              </h3>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400" data-testid="verify-result-message">
                {message}
              </p>
              <div className="mt-6 flex flex-col space-y-3">
                <Link
                  to="/login"
                  className="w-full py-2 px-4 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Go to sign in
                </Link>
                {status === 'error' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Need a new link? Sign in with your email and use “Resend verification email”.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
