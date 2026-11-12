import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { 
   
  ChevronLeft, 
  ChevronRight, 
  CheckSquare, 
  FileText, 
  Link as LinkIcon,
  Clock,
  TrendingUp,
  Target
} from 'lucide-react';
import axios from 'axios';
import { format, addDays, subDays, isToday } from 'date-fns';
import LoadingSpinner from '../components/LoadingSpinner';

const DailyView = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: dailyData, isLoading } = useQuery(
    ['daily', format(selectedDate, 'yyyy-MM-dd')],
    () => axios.get('/dashboard/daily', {
      params: { date: format(selectedDate, 'yyyy-MM-dd') }
    }).then(res => res.data),
    {
      keepPreviousData: true,
    }
  );

  const navigateDate = (direction) => {
    if (direction === 'prev') {
      setSelectedDate(subDays(selectedDate, 1));
    } else {
      setSelectedDate(addDays(selectedDate, 1));
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const TaskItem = ({ task }) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
    
    return (
      <div className={`flex items-center space-x-3 p-3 rounded-lg border ${
        task.status === 'completed' 
          ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
          : isOverdue
          ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
          : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'
      }`}>
        <div className={`flex-shrink-0 ${
          task.status === 'completed' ? 'text-green-600' : 'text-gray-400'
        }`}>
          <CheckSquare className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${
            task.status === 'completed' 
              ? 'line-through text-gray-500 dark:text-gray-400' 
              : 'text-gray-900 dark:text-white'
          }`}>
            {task.title}
          </p>
          <div className="flex items-center mt-1 space-x-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium priority-${task.priority}`}>
              {task.priority}
            </span>
            {task.estimatedTime && (
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <Clock className="h-3 w-3 mr-1" />
                {task.estimatedTime}m
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const NoteItem = ({ note }) => (
    <div className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 rounded-lg">
      <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {note.title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {note.content.substring(0, 100)}...
        </p>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mt-2">
          {note.category}
        </span>
      </div>
    </div>
  );

  const LinkItem = ({ link }) => (
    <div className="flex items-start space-x-3 p-3 bg-purple-50 border border-purple-200 dark:bg-purple-900/20 dark:border-purple-800 rounded-lg">
      <LinkIcon className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {link.title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
          {link.url}
        </p>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 mt-2">
          {link.category}
        </span>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const { tasks = [], notes = [], links = [], completedTasks = [], progress = {} } = dailyData || {};

  return (
    <div className="space-y-6">
      {/* Header with Date Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {format(selectedDate, 'EEEE, MMMM d')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {format(selectedDate, 'yyyy')}
              </p>
            </div>
            
            <button
              onClick={() => navigateDate('next')}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          
          {!isToday(selectedDate) && (
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Today
            </button>
          )}
        </div>

        {/* Progress Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Tasks Progress</p>
                <p className="text-2xl font-bold">{progress.percentage || 0}%</p>
              </div>
              <Target className="h-8 w-8 text-blue-200" />
            </div>
            <div className="mt-2">
              <div className="bg-blue-400 rounded-full h-2">
                <div 
                  className="bg-white rounded-full h-2 transition-all duration-300"
                  style={{ width: `${progress.percentage || 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Completed</p>
                <p className="text-2xl font-bold">{progress.completed || 0}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-green-200" />
            </div>
            <p className="text-green-100 text-sm mt-2">
              of {progress.total || 0} tasks
            </p>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Activity</p>
                <p className="text-2xl font-bold">{notes.length + links.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-200" />
            </div>
            <p className="text-purple-100 text-sm mt-2">
              notes & links created
            </p>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <CheckSquare className="h-5 w-5 mr-2 text-green-600" />
              Tasks for {format(selectedDate, 'MMM d')}
            </h2>
          </div>
          <div className="p-6">
            {tasks.length > 0 ? (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <TaskItem key={task._id} task={task} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  No tasks scheduled
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {isToday(selectedDate) ? 'Enjoy your free day!' : 'No tasks were scheduled for this day'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
              Completed Tasks
            </h2>
          </div>
          <div className="p-6">
            {completedTasks.length > 0 ? (
              <div className="space-y-3">
                {completedTasks.map((task) => (
                  <TaskItem key={task._id} task={task} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  No completed tasks
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Tasks completed on this day will appear here
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Notes Created */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              Notes Created
            </h2>
          </div>
          <div className="p-6">
            {notes.length > 0 ? (
              <div className="space-y-3">
                {notes.map((note) => (
                  <NoteItem key={note._id} note={note} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  No notes created
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Notes created on this day will appear here
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Links Saved */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <LinkIcon className="h-5 w-5 mr-2 text-purple-600" />
              Links Saved
            </h2>
          </div>
          <div className="p-6">
            {links.length > 0 ? (
              <div className="space-y-3">
                {links.map((link) => (
                  <LinkItem key={link._id} link={link} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <LinkIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  No links saved
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Links saved on this day will appear here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyView;