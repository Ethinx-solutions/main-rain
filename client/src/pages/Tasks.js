import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  CheckSquare,
  Square,
  Clock,
  Calendar,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

const Tasks = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('active');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const queryClient = useQueryClient();

  const { data: tasksData, isLoading } = useQuery(
    ['tasks', { search: searchQuery, status: selectedStatus, priority: selectedPriority }],
    () => axios.get('/tasks', {
      params: { search: searchQuery, status: selectedStatus, priority: selectedPriority }
    }).then(res => res.data),
    {
      keepPreviousData: true,
    }
  );

  const createTaskMutation = useMutation(
    (taskData) => axios.post('/tasks', taskData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tasks');
        setShowNewTaskForm(false);
        toast.success('Task created successfully');
      },
      onError: () => {
        toast.error('Failed to create task');
      }
    }
  );

  const updateTaskMutation = useMutation(
    ({ id, ...taskData }) => axios.put(`/tasks/${id}`, taskData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tasks');
        setEditingTask(null);
        toast.success('Task updated successfully');
      },
      onError: () => {
        toast.error('Failed to update task');
      }
    }
  );

  const updateTaskStatusMutation = useMutation(
    ({ id, status }) => axios.patch(`/tasks/${id}/status`, { status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tasks');
        toast.success('Task status updated');
      },
      onError: () => {
        toast.error('Failed to update task status');
      }
    }
  );

  const deleteTaskMutation = useMutation(
    (id) => axios.delete(`/tasks/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tasks');
        toast.success('Task deleted successfully');
      },
      onError: () => {
        toast.error('Failed to delete task');
      }
    }
  );

  const statusOptions = [
    { value: 'active', label: 'Active Tasks' },
    { value: 'all', label: 'All Tasks' },
    { value: 'todo', label: 'To Do' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const priorityOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const categories = [
    { value: 'personal', label: 'Personal' },
    { value: 'work', label: 'Work' },
    { value: 'health', label: 'Health' },
    { value: 'learning', label: 'Learning' },
    { value: 'projects', label: 'Projects' },
    { value: 'other', label: 'Other' }
  ];

  const TaskForm = ({ task, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
      title: task?.title || '',
      description: task?.description || '',
      priority: task?.priority || 'medium',
      category: task?.category || 'other',
      dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      estimatedTime: task?.estimatedTime || '',
      tags: task?.tags?.join(', ') || ''
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      const tags = formData.tags.split(',').map(tag => tag.trim()).filter(Boolean);
      onSubmit({
        ...formData,
        tags,
        dueDate: formData.dueDate || undefined,
        estimatedTime: formData.estimatedTime ? parseInt(formData.estimatedTime) : undefined,
        ...(task && { id: task._id })
      });
    };

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white dark:bg-gray-800">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {task ? 'Edit Task' : 'Create New Task'}
              </h3>
              <button
                type="button"
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter task title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Task description (optional)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {priorityOptions.slice(1).map(priority => (
                    <option key={priority.value} value={priority.value}>{priority.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estimated Time (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.estimatedTime}
                  onChange={(e) => setFormData({ ...formData, estimatedTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., 30"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="tag1, tag2, tag3"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createTaskMutation.isLoading || updateTaskMutation.isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {createTaskMutation.isLoading || updateTaskMutation.isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  task ? 'Update Task' : 'Create Task'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const TaskCard = ({ task }) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
    
    const handleStatusToggle = () => {
      const newStatus = task.status === 'completed' ? 'todo' : 'completed';
      updateTaskStatusMutation.mutate({ id: task._id, status: newStatus });
    };

    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow duration-200 ${
        isOverdue ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'
      }`}>
        <div className="flex items-start space-x-3">
          <button
            onClick={handleStatusToggle}
            className={`mt-1 flex-shrink-0 ${
              task.status === 'completed' 
                ? 'text-green-600' 
                : 'text-gray-400 hover:text-green-600'
            }`}
          >
            {task.status === 'completed' ? (
              <CheckSquare className="h-5 w-5" />
            ) : (
              <Square className="h-5 w-5" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-2">
              <h3 className={`text-lg font-medium truncate flex-1 ${
                task.status === 'completed' 
                  ? 'line-through text-gray-500 dark:text-gray-400' 
                  : 'text-gray-900 dark:text-white'
              }`}>
                {task.title}
              </h3>
              <div className="flex items-center space-x-1 ml-2">
                {isOverdue && (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <button
                  onClick={() => setEditingTask(task)}
                  className="p-1 text-gray-400 hover:text-blue-500"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteTaskMutation.mutate(task._id)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {task.description && (
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                {task.description}
              </p>
            )}

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full priority-${task.priority}`}>
                  {task.priority}
                </span>
                <span className={`px-2 py-1 rounded-full status-${task.status}`}>
                  {task.status.replace('-', ' ')}
                </span>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                  {task.category}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {task.estimatedTime && (
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>{task.estimatedTime}m</span>
                  </div>
                )}
                {task.dueDate && (
                  <div className={`flex items-center ${isOverdue ? 'text-red-500' : ''}`}>
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {task.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tasks</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your tasks and stay productive
          </p>
        </div>
        <button
          onClick={() => setShowNewTaskForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {statusOptions.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:w-48">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {priorityOptions.map(priority => (
                <option key={priority.value} value={priority.value}>{priority.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : tasksData?.tasks?.length > 0 ? (
        <div className="space-y-4">
          {tasksData.tasks.map((task) => (
            <TaskCard key={task._id} task={task} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No tasks found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchQuery || selectedStatus !== 'active' || selectedPriority !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first task'
            }
          </p>
          {!searchQuery && selectedStatus === 'active' && selectedPriority === 'all' && (
            <div className="mt-6">
              <button
                onClick={() => setShowNewTaskForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                Create your first task
              </button>
            </div>
          )}
        </div>
      )}

      {/* Forms */}
      {showNewTaskForm && (
        <TaskForm
          onSubmit={(data) => createTaskMutation.mutate(data)}
          onCancel={() => setShowNewTaskForm(false)}
        />
      )}

      {editingTask && (
        <TaskForm
          task={editingTask}
          onSubmit={(data) => updateTaskMutation.mutate(data)}
          onCancel={() => setEditingTask(null)}
        />
      )}
    </div>
  );
};

export default Tasks;