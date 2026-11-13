import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import Dashboard from '../pages/Dashboard';
import { useAuth } from '../contexts/AuthContext';

jest.mock('axios');
jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }));

test('renders the concept-led dashboard with real workspace data and actions', async () => {
  useAuth.mockReturnValue({ user: { name: 'Troy Napier' } });
  axios.get.mockResolvedValue({
    data: {
      summary: {
        totalNotes: 17,
        totalTasks: 12,
        completedTasks: 3,
        totalLinks: 8,
        completionRate: 25,
        todayTasks: 2,
        overdueTasks: 1,
      },
      recentNotes: [{ _id: 'n1', title: 'Monday Operations', category: 'work', createdAt: '2026-11-13T00:00:00.000Z' }],
      upcomingTasks: [{ _id: 't1', title: 'Follow up outstanding quotes', priority: 'high', dueDate: '2026-11-14T00:00:00.000Z' }],
      recentLinks: [{ _id: 'l1', title: 'Supplier portal', category: 'work', url: 'https://example.com' }],
      productivityInsights: { weeklyTasksCompleted: 3, averageTasksPerDay: 1.4, mostProductiveDay: 'Thursday' },
    },
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><Dashboard /></MemoryRouter>
    </QueryClientProvider>
  );

  expect(await screen.findByRole('heading', { name: /Welcome back, Troy/i })).toBeInTheDocument();
  expect(screen.getByText('17')).toBeInTheDocument();
  expect(screen.getByText('Follow up outstanding quotes')).toBeInTheDocument();
  expect(screen.getByText('Monday Operations')).toBeInTheDocument();
  expect(screen.getByText('Supplier portal')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Ask a question/i })).toHaveAttribute('href', '/assistant');
  expect(screen.queryByText('Team')).not.toBeInTheDocument();
  expect(screen.queryByText('Reports')).not.toBeInTheDocument();
});
