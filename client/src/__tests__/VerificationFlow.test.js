import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import VerifyEmail from '../pages/VerifyEmail';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';

jest.mock('axios');

const renderAt = (ui, path) =>
  render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);

describe('Email verification page (link from the verification email)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('submits the token from the URL and reports success', async () => {
    axios.post.mockResolvedValueOnce({ data: { message: 'Email verified successfully' } });

    renderAt(<VerifyEmail />, '/verify-email?token=abc123');

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/auth/verify-email', { token: 'abc123' });
    });
    expect(await screen.findByTestId('verify-result-title')).toHaveTextContent('Email verified');
    expect(screen.getByRole('link', { name: /go to sign in/i })).toBeInTheDocument();
  });

  test('shows the API error for an invalid/expired token', async () => {
    axios.post.mockRejectedValueOnce({
      response: { status: 400, data: { message: 'Invalid or already used verification token' } },
    });

    renderAt(<VerifyEmail />, '/verify-email?token=bad');

    expect(await screen.findByTestId('verify-result-title')).toHaveTextContent('Verification failed');
    expect(screen.getByTestId('verify-result-message')).toHaveTextContent('Invalid or already used verification token');
  });

  test('handles a link with no token without calling the API', async () => {
    renderAt(<VerifyEmail />, '/verify-email');

    expect(await screen.findByTestId('verify-result-title')).toHaveTextContent('Verification failed');
    expect(axios.post).not.toHaveBeenCalled();
  });
});

describe('Password reset pages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('forgot-password submits the email and shows the generic confirmation', async () => {
    axios.post.mockResolvedValueOnce({ data: { message: 'ok' } });

    renderAt(<ForgotPassword />, '/forgot-password');

    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.invalid');
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'user@example.invalid' });
    });
    expect(await screen.findByTestId('forgot-password-sent')).toBeInTheDocument();
  });

  test('reset-password submits token + new password and reports success', async () => {
    axios.post.mockResolvedValueOnce({ data: { message: 'Password reset successfully' } });

    renderAt(<ResetPassword />, '/reset-password?token=resettok');

    await userEvent.type(screen.getByLabelText(/^new password$/i), 'NewSecret123');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'NewSecret123');
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'resettok',
        password: 'NewSecret123',
      });
    });
    expect(await screen.findByTestId('reset-password-success')).toBeInTheDocument();
  });

  test('reset-password rejects mismatched passwords without an API call', async () => {
    renderAt(<ResetPassword />, '/reset-password?token=resettok');

    await userEvent.type(screen.getByLabelText(/^new password$/i), 'NewSecret123');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'Different123');
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));

    expect(screen.getByTestId('reset-password-error')).toHaveTextContent('Passwords do not match');
    expect(axios.post).not.toHaveBeenCalled();
  });
});
