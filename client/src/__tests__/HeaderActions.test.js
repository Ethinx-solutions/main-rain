import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Notes from '../pages/Notes';
import Tasks from '../pages/Tasks';
import Links from '../pages/Links';
import { useAuth } from '../contexts/AuthContext';

jest.mock('axios');
jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }));

const user = { name: 'Test User', email: 'test@example.com' };

const renderWithProviders = (ui, initialEntry = '/dashboard') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
};

beforeEach(() => {
  useAuth.mockReturnValue({ user, logout: jest.fn() });
  axios.get.mockImplementation((path) => {
    if (path === '/dashboard/overview') {
      return Promise.resolve({
        data: {
          summary: { overdueTasks: 2 },
          upcomingTasks: [{ _id: 'task-1', title: 'Send proposal', dueDate: '2026-11-14T00:00:00.000Z' }],
        },
      });
    }
    if (path === '/notes') {
      return Promise.resolve({ data: { notes: [] } });
    }
    if (path === '/tasks') {
      return Promise.resolve({ data: { tasks: [] } });
    }
    if (path === '/links') {
      return Promise.resolve({ data: { links: [] } });
    }
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

test('quick add opens a real menu and navigates to the new note action', async () => {
  renderWithProviders(
    <Routes>
      <Route path="*" element={<><Header /><LocationProbe /></>} />
    </Routes>
  );

  await userEvent.click(screen.getByRole('button', { name: 'Quick add' }));
  expect(screen.getByRole('menu')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('menuitem', { name: 'Note' }));
  expect(screen.getByTestId('location')).toHaveTextContent('/notes?new=true');
});

test('notification bell shows real task alerts instead of a hard-coded badge', async () => {
  renderWithProviders(<Header />);

  await waitFor(() => expect(screen.getByRole('button', { name: 'Notifications, 3 task alerts' })).toBeInTheDocument());
  await userEvent.click(screen.getByRole('button', { name: 'Notifications, 3 task alerts' }));

  expect(screen.getByText('2 overdue tasks')).toBeInTheDocument();
  expect(screen.getByText('Send proposal')).toBeInTheDocument();
});

test('account initial opens settings and sign-out actions', async () => {
  renderWithProviders(<Header />);

  await userEvent.click(screen.getByRole('button', { name: 'Open account menu' }));
  expect(screen.getByText('test@example.com')).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: 'Settings' })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument();
});

test('new note query opens the creation form immediately', async () => {
  renderWithProviders(<Notes />, '/notes?new=true');

  expect(await screen.findByRole('heading', { name: 'Create New Note' })).toBeInTheDocument();
});

test('new task query opens the creation form immediately', async () => {
  renderWithProviders(<Tasks />, '/tasks?new=true');

  expect(await screen.findByRole('heading', { name: 'Create New Task' })).toBeInTheDocument();
});

test('new link query opens the creation form immediately', async () => {
  renderWithProviders(<Links />, '/links?new=true');

  expect(await screen.findByRole('heading', { name: 'Save New Link' })).toBeInTheDocument();
});
