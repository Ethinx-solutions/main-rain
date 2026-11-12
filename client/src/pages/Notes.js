import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Plus, 
  Search, 
    Edit3, 
  Trash2, 
  Star, 
    FileText,
  Tag
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

const Notes = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showNewNoteForm, setShowNewNoteForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const queryClient = useQueryClient();

  const { data: notesData, isLoading } = useQuery(
    ['notes', { search: searchQuery, category: selectedCategory }],
    () => axios.get('/notes', {
      params: { search: searchQuery, category: selectedCategory }
    }).then(res => res.data),
    {
      keepPreviousData: true,
    }
  );

  const createNoteMutation = useMutation(
    (noteData) => axios.post('/notes', noteData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('notes');
        setShowNewNoteForm(false);
        toast.success('Note created successfully');
      },
      onError: () => {
        toast.error('Failed to create note');
      }
    }
  );

  const updateNoteMutation = useMutation(
    ({ id, ...noteData }) => axios.put(`/notes/${id}`, noteData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('notes');
        setEditingNote(null);
        toast.success('Note updated successfully');
      },
      onError: () => {
        toast.error('Failed to update note');
      }
    }
  );

  const deleteNoteMutation = useMutation(
    (id) => axios.delete(`/notes/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('notes');
        toast.success('Note deleted successfully');
      },
      onError: () => {
        toast.error('Failed to delete note');
      }
    }
  );

  const toggleFavoriteMutation = useMutation(
    ({ id, isFavorite }) => axios.put(`/notes/${id}`, { isFavorite }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('notes');
      }
    }
  );

  const categories = [
    { value: 'all', label: 'All Notes' },
    { value: 'personal', label: 'Personal' },
    { value: 'work', label: 'Work' },
    { value: 'ideas', label: 'Ideas' },
    { value: 'learning', label: 'Learning' },
    { value: 'projects', label: 'Projects' },
    { value: 'other', label: 'Other' }
  ];

  const NoteForm = ({ note, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
      title: note?.title || '',
      content: note?.content || '',
      category: note?.category || 'other',
      tags: note?.tags?.join(', ') || '',
      priority: note?.priority || 'medium'
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      const tags = formData.tags.split(',').map(tag => tag.trim()).filter(Boolean);
      onSubmit({
        ...formData,
        tags,
        ...(note && { id: note._id })
      });
    };

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white dark:bg-gray-800">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {note ? 'Edit Note' : 'Create New Note'}
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
                placeholder="Enter note title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Content
              </label>
              <textarea
                required
                rows={8}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Write your note content here..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {categories.slice(1).map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
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
                disabled={createNoteMutation.isLoading || updateNoteMutation.isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {createNoteMutation.isLoading || updateNoteMutation.isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  note ? 'Update Note' : 'Create Note'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const NoteCard = ({ note }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate flex-1">
          {note.title}
        </h3>
        <div className="flex items-center space-x-1 ml-2">
          <button
            onClick={() => toggleFavoriteMutation.mutate({ id: note._id, isFavorite: !note.isFavorite })}
            className={`p-1 rounded ${note.isFavorite ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
          >
            <Star className="h-4 w-4" fill={note.isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => setEditingNote(note)}
            className="p-1 text-gray-400 hover:text-blue-500"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => deleteNoteMutation.mutate(note._id)}
            className="p-1 text-gray-400 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-3">
        {note.content}
      </p>

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full priority-${note.priority}`}>
            {note.priority}
          </span>
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
            {note.category}
          </span>
        </div>
        <span>{new Date(note.createdAt).toLocaleDateString()}</span>
      </div>

      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {note.tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            >
              <Tag className="h-3 w-3 mr-1" />
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notes</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Capture and organize your thoughts
          </p>
        </div>
        <button
          onClick={() => setShowNewNoteForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Note
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
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notes Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : notesData?.notes?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notesData.notes.map((note) => (
            <NoteCard key={note._id} note={note} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No notes found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchQuery || selectedCategory !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first note'
            }
          </p>
          {!searchQuery && selectedCategory === 'all' && (
            <div className="mt-6">
              <button
                onClick={() => setShowNewNoteForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                Create your first note
              </button>
            </div>
          )}
        </div>
      )}

      {/* Forms */}
      {showNewNoteForm && (
        <NoteForm
          onSubmit={(data) => createNoteMutation.mutate(data)}
          onCancel={() => setShowNewNoteForm(false)}
        />
      )}

      {editingNote && (
        <NoteForm
          note={editingNote}
          onSubmit={(data) => updateNoteMutation.mutate(data)}
          onCancel={() => setEditingNote(null)}
        />
      )}
    </div>
  );
};

export default Notes;