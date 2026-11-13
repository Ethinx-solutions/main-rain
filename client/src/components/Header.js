import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  Plus,
  FileText,
  CheckSquare,
  Link as LinkIcon,
  Settings,
  LogOut,
  AlertCircle,
  Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Header = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const menuAreaRef = useRef(null);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenu, setOpenMenu] = useState(null);

  const { data: dashboardData, isLoading: notificationsLoading, isError: notificationsError } = useQuery(
    'dashboard',
    () => axios.get('/dashboard/overview').then(res => res.data),
    {
      enabled: Boolean(user),
      staleTime: 60 * 1000,
      refetchInterval: 5 * 60 * 1000,
    }
  );

  const overdueCount = dashboardData?.summary?.overdueTasks || 0;
  const upcomingTasks = dashboardData?.upcomingTasks || [];
  const notificationCount = overdueCount + upcomingTasks.length;

  // The product defaults to its executive graphite theme; respect an explicit
  // light-theme choice if the user has made one.
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme !== 'light') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    const closeMenus = (event) => {
      if (menuAreaRef.current && !menuAreaRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
      }
    };

    document.addEventListener('mousedown', closeMenus);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeMenus);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Implement global search functionality
      console.log('Searching for:', searchQuery);
    }
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const toggleMenu = (menuName) => {
    setOpenMenu(current => current === menuName ? null : menuName);
  };

  const goTo = (path) => {
    setOpenMenu(null);
    navigate(path);
  };

  const handleLogout = () => {
    setOpenMenu(null);
    logout();
    navigate('/login');
  };

  const formatDueDate = (date) => new Date(date).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short'
  });

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl shadow-sm border-b border-gray-200 dark:border-yellow-900/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-x-4">
            {/* Mobile menu button */}
            <button
              type="button"
              className="lg:hidden -m-2.5 p-2.5 text-gray-700 dark:text-gray-300"
              onClick={onMenuClick}
              aria-label="Open navigation"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Date and time */}
            <div className="hidden sm:block">
              <div className="text-sm text-gray-900 dark:text-white font-medium">
                {getCurrentTime()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {getCurrentDate()}
              </div>
            </div>
          </div>

          {/* Center - Search */}
          <div className="hidden sm:block flex-1 max-w-lg mx-4">
            <form onSubmit={handleSearch} className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your Second Brain..."
                className="block w-full rounded-md border-0 bg-gray-50 dark:bg-gray-700 py-1.5 pl-10 pr-3 text-gray-900 dark:text-white placeholder:text-gray-400 focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500 sm:text-sm sm:leading-6 transition-colors duration-200"
              />
            </form>
          </div>

          {/* Right side */}
          <div ref={menuAreaRef} className="flex items-center gap-x-2 sm:gap-x-4">
            {/* Quick add button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleMenu('quick-add')}
                className="relative rounded-full bg-blue-600 p-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-200"
                title="Quick add"
                aria-label="Quick add"
                aria-haspopup="menu"
                aria-expanded={openMenu === 'quick-add'}
              >
                <Plus className="h-5 w-5" />
              </button>
              {openMenu === 'quick-add' && (
                <div role="menu" className="absolute right-0 mt-3 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-yellow-900/40 dark:bg-gray-800">
                  <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-yellow-500">Create new</div>
                  {[
                    { label: 'Note', path: '/notes?new=true', icon: FileText },
                    { label: 'Task', path: '/tasks?new=true', icon: CheckSquare },
                    { label: 'Saved link', path: '/links?new=true', icon: LinkIcon },
                  ].map((item) => (
                    <button key={item.path} type="button" role="menuitem" onClick={() => goTo(item.path)} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-yellow-900/20">
                      <item.icon className="h-4 w-4 text-blue-600 dark:text-yellow-500" />
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleMenu('notifications')}
                className="relative rounded-full bg-gray-50 dark:bg-gray-700 p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-200"
                title="Notifications"
                aria-label={notificationCount ? `Notifications, ${notificationCount} task alerts` : 'Notifications'}
                aria-haspopup="menu"
                aria-expanded={openMenu === 'notifications'}
              >
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-[10px] leading-4 text-white text-center" aria-hidden="true">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>
              {openMenu === 'notifications' && (
                <div role="menu" className="absolute right-0 mt-3 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-yellow-900/40 dark:bg-gray-800">
                  <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                    <p className="font-semibold text-gray-900 dark:text-white">Task alerts</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Due and overdue work from your Second Brain</p>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notificationsLoading && <p className="px-4 py-5 text-sm text-gray-500">Loading alerts…</p>}
                    {notificationsError && (
                      <div className="flex gap-3 px-4 py-5 text-sm text-red-600 dark:text-red-400">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        Alerts could not be loaded right now.
                      </div>
                    )}
                    {!notificationsLoading && !notificationsError && notificationCount === 0 && (
                      <p className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">You’re all caught up.</p>
                    )}
                    {overdueCount > 0 && (
                      <button type="button" role="menuitem" onClick={() => goTo('/tasks')} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-950/20">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                        <span><span className="block text-sm font-medium text-gray-900 dark:text-white">{overdueCount} overdue {overdueCount === 1 ? 'task' : 'tasks'}</span><span className="text-xs text-gray-500 dark:text-gray-400">Open tasks to review them</span></span>
                      </button>
                    )}
                    {upcomingTasks.map((task) => (
                      <button key={task._id} type="button" role="menuitem" onClick={() => goTo('/tasks')} className="flex w-full gap-3 border-t border-gray-100 px-4 py-3 text-left hover:bg-blue-50 dark:border-gray-700 dark:hover:bg-yellow-900/20">
                        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-yellow-500" />
                        <span className="min-w-0"><span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{task.title}</span><span className="text-xs text-gray-500 dark:text-gray-400">Due {formatDueDate(task.dueDate)}</span></span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Dark mode toggle */}
            <button
              type="button"
              onClick={toggleDarkMode}
              className="relative rounded-full bg-gray-50 dark:bg-gray-700 p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-200"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            {/* User avatar */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleMenu('profile')}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-200"
                title={user?.name || 'Account'}
                aria-label="Open account menu"
                aria-haspopup="menu"
                aria-expanded={openMenu === 'profile'}
              >
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </button>
              {openMenu === 'profile' && (
                <div role="menu" className="absolute right-0 mt-3 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-yellow-900/40 dark:bg-gray-800">
                  <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                  </div>
                  <button type="button" role="menuitem" onClick={() => goTo('/settings')} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-yellow-900/20">
                    <Settings className="h-4 w-4 text-blue-600 dark:text-yellow-500" />
                    Settings
                  </button>
                  <button type="button" role="menuitem" onClick={handleLogout} className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 dark:border-gray-700 dark:text-red-400 dark:hover:bg-red-950/20">
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
