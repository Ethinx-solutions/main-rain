import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  CheckSquare, 
  Link as LinkIcon, 
  Calendar,
  TrendingUp,
  Clock,
  Star,
  AlertCircle,
  Plus,
  ArrowRight
} from 'lucide-react';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const { data: dashboardData, isLoading, error } = useQuery(
    'dashboard',
    () => axios.get('/dashboard/overview').then(res => res.data),
    {
      refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
          Error loading dashboard
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Please try refreshing the page
        </p>
      </div>
    );
  }

  const { summary, recentNotes, upcomingTasks, recentLinks, productivityInsights } = dashboardData;

  const stats = [
    {
      name: 'Total Notes',
      value: summary?.totalNotes || 0,
      icon: FileText,
      color: 'bg-blue-500',
      href: '/notes'
    },
    {
      name: 'Active Tasks',
      value: (summary?.totalTasks || 0) - (summary?.completedTasks || 0),
      icon: CheckSquare,
      color: 'bg-green-500',
      href: '/tasks'
    },
    {
      name: 'Saved Links',
      value: summary?.totalLinks || 0,
      icon: LinkIcon,
      color: 'bg-purple-500',
      href: '/links'
    },
    {
      name: 'Completion Rate',
      value: `${summary?.completionRate || 0}%`,
      icon: TrendingUp,
      color: 'bg-orange-500',
      href: '/tasks'
    }
  ];

  const quickActions = [
    {
      name: 'New Note',
      description: 'Capture a quick thought',
      icon: FileText,
      color: 'bg-blue-500',
      href: '/notes?new=true'
    },
    {
      name: 'Add Task',
      description: 'Create a new task',
      icon: CheckSquare,
      color: 'bg-green-500',
      href: '/tasks?new=true'
    },
    {
      name: 'Save Link',
      description: 'Bookmark a resource',
      icon: LinkIcon,
      color: 'bg-purple-500',
      href: '/links?new=true'
    },
    {
      name: 'Daily View',
      description: 'See today\'s agenda',
      icon: Calendar,
      color: 'bg-orange-500',
      href: '/daily'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back! 👋
        </h1>
        <p className="text-blue-100">
          Here's what's happening in your Second Brain today
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className="relative bg-white dark:bg-gray-800 pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200"
          >
            <dt>
              <div className={`absolute ${stat.color} rounded-md p-3`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <p className="ml-16 text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {stat.name}
              </p>
            </dt>
            <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {stat.value}
              </p>
            </dd>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                to={action.href}
                className="relative group bg-gray-50 dark:bg-gray-700 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                <div>
                  <span className={`rounded-lg inline-flex p-3 ${action.color} text-white`}>
                    <action.icon className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    <span className="absolute inset-0" />
                    {action.name}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {action.description}
                  </p>
                </div>
                <span className="pointer-events-none absolute top-6 right-6 text-gray-300 group-hover:text-gray-400">
                  <Plus className="h-6 w-6" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Notes */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Recent Notes
              </h3>
              <Link
                to="/notes"
                className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
              >
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {recentNotes?.length > 0 ? (
                recentNotes.map((note) => (
                  <div
                    key={note._id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {note.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {note.category}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    No notes yet
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Get started by creating your first note
                  </p>
                  <div className="mt-6">
                    <Link
                      to="/notes?new=true"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="-ml-1 mr-2 h-5 w-5" />
                      New Note
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Upcoming Tasks
              </h3>
              <Link
                to="/tasks"
                className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
              >
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {upcomingTasks?.length > 0 ? (
                upcomingTasks.map((task) => (
                  <div
                    key={task._id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {task.title}
                      </p>
                      <div className="flex items-center mt-1">
                        <Clock className="h-3 w-3 text-gray-400 mr-1" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium priority-${task.priority}`}>
                      {task.priority}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    No upcoming tasks
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Stay organized by adding your tasks
                  </p>
                  <div className="mt-6">
                    <Link
                      to="/tasks?new=true"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="-ml-1 mr-2 h-5 w-5" />
                      Add Task
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Links */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Recent Links
              </h3>
              <Link
                to="/links"
                className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
              >
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {recentLinks?.length > 0 ? (
                recentLinks.map((link) => (
                  <div
                    key={link._id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {link.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {link.url}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                      {link.category}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <LinkIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    No links saved
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Save interesting links for later
                  </p>
                  <div className="mt-6">
                    <Link
                      to="/links?new=true"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                    >
                      <Plus className="-ml-1 mr-2 h-5 w-5" />
                      Save Link
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Productivity Insights */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Productivity Insights
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Tasks completed this week</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {productivityInsights?.weeklyTasksCompleted || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Average tasks per day</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {Math.round(productivityInsights?.averageTasksPerDay || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Most productive day</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {productivityInsights?.mostProductiveDay || 'No data'}
                </span>
              </div>
              {summary?.overdueTasks > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-sm text-red-700 dark:text-red-300">Overdue tasks</span>
                  </div>
                  <span className="text-sm font-medium text-red-900 dark:text-red-200">
                    {summary.overdueTasks}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;