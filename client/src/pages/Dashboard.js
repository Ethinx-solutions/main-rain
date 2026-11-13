import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import {
  FileText, CheckSquare, Link as LinkIcon, Calendar, TrendingUp,
  Clock, AlertCircle, Plus, ArrowRight, Sparkles, Zap, ShieldCheck, Send
} from 'lucide-react';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const { data: dashboardData, isLoading, error } = useQuery(
    'dashboard',
    () => axios.get('/dashboard/overview').then(res => res.data),
    { refetchInterval: 5 * 60 * 1000 }
  );

  if (isLoading) return <div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>;

  if (error) {
    return (
      <div className="py-12 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Error loading dashboard</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Please try refreshing the page</p>
      </div>
    );
  }

  const { summary, recentNotes, upcomingTasks, recentLinks, productivityInsights } = dashboardData;
  const activeTasks = Math.max(0, (summary?.totalTasks || 0) - (summary?.completedTasks || 0));
  const firstName = user?.name?.split(' ')[0] || 'there';

  const stats = [
    { name: 'Notes', value: summary?.totalNotes || 0, detail: recentNotes?.length ? `${recentNotes.length} recently active` : 'Ready to capture', icon: FileText, href: '/notes' },
    { name: 'Active tasks', value: activeTasks, detail: summary?.overdueTasks ? `${summary.overdueTasks} overdue` : `${summary?.todayTasks || 0} due today`, icon: CheckSquare, href: '/tasks', attention: Boolean(summary?.overdueTasks) },
    { name: 'Saved links', value: summary?.totalLinks || 0, detail: 'Your resource library', icon: LinkIcon, href: '/links' },
    { name: 'Completion', value: `${summary?.completionRate || 0}%`, detail: `${summary?.completedTasks || 0} tasks completed`, icon: TrendingUp, href: '/tasks' }
  ];

  const quickActions = [
    { name: 'New note', icon: FileText, href: '/notes?new=true' },
    { name: 'Add task', icon: CheckSquare, href: '/tasks?new=true' },
    { name: 'Save link', icon: LinkIcon, href: '/links?new=true' },
    { name: 'Daily view', icon: Calendar, href: '/daily' }
  ];

  const formattedDate = new Date().toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const EmptyState = ({ icon: Icon, title, copy, action, href }) => (
    <div className="sb-empty-state">
      <span className="sb-empty-state__icon"><Icon className="h-5 w-5" /></span>
      <div><p className="sb-empty-state__title">{title}</p><p className="sb-empty-state__copy">{copy}</p></div>
      <Link to={href} className="sb-text-link">{action}<ArrowRight className="h-3.5 w-3.5" /></Link>
    </div>
  );

  return (
    <div className="sb-dashboard">
      <section className="sb-hero">
        <div className="sb-hero__circuit" aria-hidden="true" />
        <div className="sb-hero__content">
          <div className="sb-kicker"><ShieldCheck className="h-3.5 w-3.5" /> Private knowledge workspace</div>
          <h1>Welcome back, <span>{firstName}</span></h1>
          <p>Your business knowledge, priorities and AI assistant—organised for the day ahead.</p>
        </div>
        <div className="sb-hero__date"><Calendar className="h-4 w-4" /><span>{formattedDate}</span></div>
      </section>

      <section className="sb-stats" aria-label="Workspace overview">
        {stats.map((stat) => (
          <Link key={stat.name} to={stat.href} className="sb-stat-card">
            <span className="sb-stat-card__icon"><stat.icon className="h-5 w-5" /></span>
            <span className="sb-stat-card__body">
              <span className="sb-stat-card__label">{stat.name}</span><strong>{stat.value}</strong>
              <small className={stat.attention ? 'sb-stat-card__attention' : ''}>{stat.detail}</small>
            </span>
            <ArrowRight className="sb-stat-card__arrow h-4 w-4" />
          </Link>
        ))}
      </section>

      <section className="sb-ai-card">
        <div className="sb-ai-card__mark"><Sparkles className="h-8 w-8" /></div>
        <div className="sb-ai-card__copy">
          <div className="sb-kicker"><Zap className="h-3.5 w-3.5" /> EthinX AI Assistant</div>
          <h2>Ask your Second Brain</h2>
          <p>Search your own notes, links and indexed business documents for precise, cited answers.</p>
        </div>
        <Link to="/assistant" className="sb-ai-prompt" aria-label="Ask a question">
          <Sparkles className="h-4 w-4" />
          <span>e.g. What is our quoting procedure?</span>
          <span className="sb-ai-prompt__send"><Send className="h-4 w-4" /></span>
        </Link>
      </section>

      <section className="sb-action-bar" aria-label="Quick actions">
        <div><span className="sb-section-label">Quick actions</span><p>Capture and organise without breaking focus.</p></div>
        <div className="sb-action-bar__items">
          {quickActions.map((action) => (
            <Link key={action.name} to={action.href} className="sb-action-chip">
              <action.icon className="h-4 w-4" /><span>{action.name}</span><Plus className="h-3.5 w-3.5" />
            </Link>
          ))}
        </div>
      </section>

      <section className="sb-content-grid">
        <article className="sb-panel sb-panel--wide">
          <header className="sb-panel__header">
            <div><span className="sb-section-label">Today</span><h2>Upcoming tasks</h2></div>
            <Link to="/tasks" className="sb-text-link">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
          </header>
          <div className="sb-panel__body">
            {upcomingTasks?.length > 0 ? upcomingTasks.map((task) => (
              <Link to="/tasks" key={task._id} className="sb-list-row">
                <span className="sb-list-row__check"><CheckSquare className="h-4 w-4" /></span>
                <span className="sb-list-row__main"><strong>{task.title}</strong><small><Clock className="h-3.5 w-3.5" /> {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : 'No due date'}</small></span>
                <span className={`sb-priority sb-priority--${task.priority}`}>{task.priority}</span>
              </Link>
            )) : <EmptyState icon={CheckSquare} title="Nothing due this week" copy="Add a task to turn your priorities into a plan." action="Add task" href="/tasks?new=true" />}
          </div>
        </article>

        <article className="sb-panel">
          <header className="sb-panel__header"><div><span className="sb-section-label">Knowledge</span><h2>Recent notes</h2></div><Link to="/notes" className="sb-text-link">View all <ArrowRight className="h-3.5 w-3.5" /></Link></header>
          <div className="sb-panel__body">
            {recentNotes?.length > 0 ? recentNotes.map((note) => (
              <Link to="/notes" key={note._id} className="sb-list-row"><span className="sb-list-row__document"><FileText className="h-4 w-4" /></span><span className="sb-list-row__main"><strong>{note.title}</strong><small>{note.category} · {new Date(note.createdAt).toLocaleDateString('en-AU')}</small></span><ArrowRight className="h-4 w-4" /></Link>
            )) : <EmptyState icon={FileText} title="No notes yet" copy="Capture your first idea, decision or process." action="New note" href="/notes?new=true" />}
          </div>
        </article>

        <article className="sb-panel">
          <header className="sb-panel__header"><div><span className="sb-section-label">Resources</span><h2>Recent links</h2></div><Link to="/links" className="sb-text-link">View all <ArrowRight className="h-3.5 w-3.5" /></Link></header>
          <div className="sb-panel__body">
            {recentLinks?.length > 0 ? recentLinks.map((link) => (
              <Link to="/links" key={link._id} className="sb-list-row"><span className="sb-list-row__document"><LinkIcon className="h-4 w-4" /></span><span className="sb-list-row__main"><strong>{link.title}</strong><small>{link.category} · {link.url}</small></span><ArrowRight className="h-4 w-4" /></Link>
            )) : <EmptyState icon={LinkIcon} title="No saved links" copy="Build a useful library of references and tools." action="Save link" href="/links?new=true" />}
          </div>
        </article>

        <article className="sb-panel sb-insights">
          <header className="sb-panel__header"><div><span className="sb-section-label">Momentum</span><h2>Productivity</h2></div><TrendingUp className="h-5 w-5" /></header>
          <div className="sb-insights__grid">
            <div><strong>{productivityInsights?.weeklyTasksCompleted || 0}</strong><span>Completed this week</span></div>
            <div><strong>{Math.round(productivityInsights?.averageTasksPerDay || 0)}</strong><span>Average per day</span></div>
            <div><strong>{productivityInsights?.mostProductiveDay || '—'}</strong><span>Best day</span></div>
          </div>
          {summary?.overdueTasks > 0 && <Link to="/tasks" className="sb-overdue"><AlertCircle className="h-4 w-4" /> {summary.overdueTasks} overdue {summary.overdueTasks === 1 ? 'task' : 'tasks'}<ArrowRight className="ml-auto h-4 w-4" /></Link>}
        </article>
      </section>
    </div>
  );
};

export default Dashboard;
