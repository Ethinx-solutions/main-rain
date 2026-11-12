import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import axios from 'axios';
import App from '../App';
import { AuthProvider } from '../contexts/AuthContext';

jest.mock('axios');

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderApp = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('App routing and rendering', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('renders the login page for unauthenticated visitors', async () => {
    axios.get.mockRejectedValue({ response: { status: 401 } });
    renderApp();
    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  test('renders the app shell for authenticated users', async () => {
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('user', JSON.stringify({ id: '1', email: 'a@b.c', name: 'A' }));
    axios.get.mockResolvedValue({
      data: { user: { id: '1', email: 'a@b.c', name: 'A', isVerified: true } },
    });
    renderApp();
    await waitFor(() => {
      expect(screen.getAllByText(/dashboard/i).length).toBeGreaterThan(0);
    });
    // Sidebar navigation is present (several nav items share these names)
    expect(screen.getAllByText(/notes/i).length).toBeGreaterThan(0);
  });
});
