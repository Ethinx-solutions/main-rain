import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { AuthProvider } from '../contexts/AuthContext';
import Login from '../pages/Login';
import Register from '../pages/Register';

jest.mock('axios');
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => null,
}));

const renderWithProviders = (ui) =>
  render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );

describe('Login with email verification flow', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('renders the login form', () => {
    renderWithProviders(<Login />);
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('shows the verification-required banner when the account is unverified', async () => {
    axios.post.mockRejectedValueOnce({
      response: { status: 403, data: { message: 'Please verify your email address before logging in.', requiresVerification: true } },
    });
    renderWithProviders(<Login />);
    await userEvent.type(screen.getByLabelText(/email address/i), 'pending@example.invalid');
    await userEvent.type(screen.getByLabelText(/password/i), 'Secret123!');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByTestId('verify-required-banner')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /resend verification/i })).toBeInTheDocument();
    expect(axios.post).toHaveBeenCalledWith('/auth/login', {
      email: 'pending@example.invalid',
      password: 'Secret123!',
    });
  });

  test('resending a verification email is wired to the API', async () => {
    axios.post.mockImplementation((url) => {
      if (url === '/auth/login') {
        return Promise.reject({
          response: { status: 403, data: { message: 'Verify first', requiresVerification: true } },
        });
      }
      if (url === '/auth/resend-verification') {
        return Promise.resolve({ data: { message: 'ok', emailSent: true } });
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    renderWithProviders(<Login />);
    await userEvent.type(screen.getByLabelText(/email address/i), 'pending@example.invalid');
    await userEvent.type(screen.getByLabelText(/password/i), 'Secret123!');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByTestId('verify-required-banner')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /resend verification/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/auth/resend-verification', { email: 'pending@example.invalid' });
    });
    expect(toast.success).toHaveBeenCalledWith('Verification email sent - check your inbox');
  });
});

describe('Register with verification flow', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('successful registration shows a check-your-email screen instead of a session', async () => {
    axios.post.mockResolvedValueOnce({
      status: 201,
      data: { message: 'Account created', requiresVerification: true, emailSent: true },
    });
    renderWithProviders(<Register />);

    await userEvent.type(screen.getByLabelText(/full name/i), 'Test User');
    await userEvent.type(screen.getByLabelText(/email address/i), 'new@example.invalid');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'Secret123!');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'Secret123!');
    await userEvent.click(screen.getByLabelText(/terms and conditions/i));
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByTestId('verify-instructions')).toBeInTheDocument();
    expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    expect(screen.getByText(/new@example\.invalid/)).toBeInTheDocument();
    // No token stored - the user is NOT logged in after registering
    expect(localStorage.getItem('token')).toBeNull();
  });
});
