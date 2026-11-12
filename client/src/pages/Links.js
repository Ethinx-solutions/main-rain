import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Plus, 
  Search, 
    Edit3, 
  Trash2, 
  ExternalLink,
  Star,
  Globe,
  Tag
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

const Links = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showNewLinkForm, setShowNewLinkForm] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const queryClient = useQueryClient();

  const { data: linksData, isLoading } = useQuery(
    ['links', { search: searchQuery, category: selectedCategory }],
    () => axios.get('/links', {
      params: { search: searchQuery, category: selectedCategory }
    }).then(res => res.data),
    {
      keepPreviousData: true,
    }
  );

  const createLinkMutation = useMutation(
    (linkData) => axios.post('/links', linkData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('links');
        setShowNewLinkForm(false);
        toast.success('Link saved successfully');
      },
      onError: () => {
        toast.error('Failed to save link');
      }
    }
  );

  const updateLinkMutation = useMutation(
    ({ id, ...linkData }) => axios.put(`/links/${id}`, linkData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('links');
        setEditingLink(null);
        toast.success('Link updated successfully');
      },
      onError: () => {
        toast.error('Failed to update link');
      }
    }
  );

  const deleteLinkMutation = useMutation(
    (id) => axios.delete(`/links/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('links');
        toast.success('Link deleted successfully');
      },
      onError: () => {
        toast.error('Failed to delete link');
      }
    }
  );

  const toggleFavoriteMutation = useMutation(
    ({ id, isFavorite }) => axios.put(`/links/${id}`, { isFavorite }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('links');
      }
    }
  );

  const recordClickMutation = useMutation(
    (id) => axios.post(`/links/${id}/click`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('links');
      }
    }
  );

  const categories = [
    { value: 'all', label: 'All Links' },
    { value: 'articles', label: 'Articles' },
    { value: 'tools', label: 'Tools' },
    { value: 'resources', label: 'Resources' },
    { value: 'inspiration', label: 'Inspiration' },
    { value: 'learning', label: 'Learning' },
    { value: 'work', label: 'Work' },
    { value: 'personal', label: 'Personal' },
    { value: 'other', label: 'Other' }
  ];

  const LinkForm = ({ link, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
      title: link?.title || '',
      url: link?.url || '',
      description: link?.description || '',
      category: link?.category || 'other',
      tags: link?.tags?.join(', ') || ''
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      const tags = formData.tags.split(',').map(tag => tag.trim()).filter(Boolean);
      onSubmit({
        ...formData,
        tags,
        ...(link && { id: link._id })
      });
    };

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white dark:bg-gray-800">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {link ? 'Edit Link' : 'Save New Link'}
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
                URL
              </label>
              <input
                type="url"
                required
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="https://example.com"
              />
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
                placeholder="Enter link title"
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
                placeholder="Brief description (optional)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                disabled={createLinkMutation.isLoading || updateLinkMutation.isLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {createLinkMutation.isLoading || updateLinkMutation.isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  link ? 'Update Link' : 'Save Link'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const LinkCard = ({ link }) => {
    const handleLinkClick = () => {
      recordClickMutation.mutate(link._id);
      window.open(link.url, '_blank', 'noopener,noreferrer');
    };

    const getDomain = (url) => {
      try {
        return new URL(url).hostname;
      } catch {
        return url;
      }
    };

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow duration-200">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate flex-1">
            {link.title}
          </h3>
          <div className="flex items-center space-x-1 ml-2">
            <button
              onClick={() => toggleFavoriteMutation.mutate({ id: link._id, isFavorite: !link.isFavorite })}
              className={`p-1 rounded ${link.isFavorite ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
            >
              <Star className="h-4 w-4" fill={link.isFavorite ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={handleLinkClick}
              className="p-1 text-gray-400 hover:text-blue-500"
              title="Open link"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
            <button
              onClick={() => setEditingLink(link)}
              className="p-1 text-gray-400 hover:text-blue-500"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => deleteLinkMutation.mutate(link._id)}
              className="p-1 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
          <Globe className="h-4 w-4 mr-1" />
          <span className="truncate">{getDomain(link.url)}</span>
        </div>

        {link.description && (
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
            {link.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full">
              {link.category}
            </span>
            {link.clickCount > 0 && (
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                {link.clickCount} clicks
              </span>
            )}
          </div>
          <span>{new Date(link.createdAt).toLocaleDateString()}</span>
        </div>

        {link.tags && link.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {link.tags.map((tag, index) => (
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
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Links</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Save and organize your favorite links
          </p>
        </div>
        <button
          onClick={() => setShowNewLinkForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Save Link
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
                placeholder="Search links..."
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

      {/* Links Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : linksData?.links?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {linksData.links.map((link) => (
            <LinkCard key={link._id} link={link} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Globe className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No links found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchQuery || selectedCategory !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Get started by saving your first link'
            }
          </p>
          {!searchQuery && selectedCategory === 'all' && (
            <div className="mt-6">
              <button
                onClick={() => setShowNewLinkForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                Save your first link
              </button>
            </div>
          )}
        </div>
      )}

      {/* Forms */}
      {showNewLinkForm && (
        <LinkForm
          onSubmit={(data) => createLinkMutation.mutate(data)}
          onCancel={() => setShowNewLinkForm(false)}
        />
      )}

      {editingLink && (
        <LinkForm
          link={editingLink}
          onSubmit={(data) => updateLinkMutation.mutate(data)}
          onCancel={() => setEditingLink(null)}
        />
      )}
    </div>
  );
};

export default Links;