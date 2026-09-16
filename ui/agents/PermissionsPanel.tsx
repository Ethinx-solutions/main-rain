import React, { useState } from 'react';
import { 
  Shield, 
  Plus, 
  Trash2, 
  Save, 
  AlertTriangle,
  Lock,
  Unlock,
  ExternalLink
} from 'lucide-react';
import { useAgents, useSelectedAgent } from './AgentContext';

const PermissionsPanel: React.FC = () => {
  const { dispatch } = useAgents();
  const selectedAgent = useSelectedAgent();
  const [editMode, setEditMode] = useState(false);
  const [tempPermissions, setTempPermissions] = useState<string[]>([]);
  const [newPermission, setNewPermission] = useState('');

  React.useEffect(() => {
    if (selectedAgent) {
      setTempPermissions([...selectedAgent.permissions]);
    }
  }, [selectedAgent]);

  if (!selectedAgent) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Agent Selected
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Select an agent to manage its permissions
        </p>
      </div>
    );
  }

  if (!selectedAgent.requiresExternalAccess) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <Shield className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Internal Agent
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          This agent operates internally and doesn't require external permissions
        </p>
        <div className="mt-4 inline-flex items-center px-3 py-2 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm">
          <Shield className="h-4 w-4 mr-2" />
          No external data access
        </div>
      </div>
    );
  }

  const handleStartEdit = () => {
    setEditMode(true);
    setTempPermissions([...selectedAgent.permissions]);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setTempPermissions([...selectedAgent.permissions]);
    setNewPermission('');
  };

  const handleSavePermissions = () => {
    dispatch({
      type: 'UPDATE_PERMISSIONS',
      payload: {
        agentId: selectedAgent.id,
        permissions: tempPermissions
      }
    });
    setEditMode(false);
    setNewPermission('');
  };

  const handleAddPermission = () => {
    if (newPermission.trim() && !tempPermissions.includes(newPermission.trim())) {
      setTempPermissions([...tempPermissions, newPermission.trim()]);
      setNewPermission('');
    }
  };

  const handleRemovePermission = (index: number) => {
    setTempPermissions(tempPermissions.filter((_, i) => i !== index));
  };

  const getPermissionType = (permission: string) => {
    if (permission.includes('read')) return 'read';
    if (permission.includes('write')) return 'write';
    if (permission.includes('admin')) return 'admin';
    return 'other';
  };

  const getPermissionColor = (type: string) => {
    switch (type) {
      case 'read':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'write':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const commonPermissions = [
    'stripe:read',
    'stripe:write',
    'stripe:webhooks',
    'supabase:read',
    'supabase:write',
    'storage:upload',
    'storage:download',
    'admin:notify',
    'deployment:status',
    'system:monitor',
    'audit:write',
    'compliance:log',
    'immutable:append',
    'db:read',
    'db:write',
    'notifications:send'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ExternalLink className="h-6 w-6 text-orange-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                External Permissions
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage {selectedAgent.name} external data access permissions
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {!editMode ? (
              <button
                onClick={handleStartEdit}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Unlock className="h-4 w-4 mr-2" />
                Edit Permissions
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePermissions}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Current Permissions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
          Current Permissions
        </h3>
        
        {(editMode ? tempPermissions : selectedAgent.permissions).length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Lock className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">No permissions configured</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(editMode ? tempPermissions : selectedAgent.permissions).map((permission, index) => {
              const type = getPermissionType(permission);
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
                >
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPermissionColor(type)}`}>
                      {type}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {permission}
                    </span>
                  </div>
                  
                  {editMode && (
                    <button
                      onClick={() => handleRemovePermission(index)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add New Permission */}
      {editMode && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            Add New Permission
          </h3>
          
          <div className="space-y-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newPermission}
                onChange={(e) => setNewPermission(e.target.value)}
                placeholder="e.g., stripe:read, db:write"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                onKeyPress={(e) => e.key === 'Enter' && handleAddPermission()}
              />
              <button
                onClick={handleAddPermission}
                disabled={!newPermission.trim() || tempPermissions.includes(newPermission.trim())}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </button>
            </div>
            
            {/* Common Permissions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Common Permissions
              </label>
              <div className="flex flex-wrap gap-2">
                {commonPermissions
                  .filter(perm => !tempPermissions.includes(perm))
                  .map((permission) => (
                    <button
                      key={permission}
                      onClick={() => {
                        setTempPermissions([...tempPermissions, permission]);
                      }}
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {permission}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Warning */}
      {selectedAgent.permissions.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Security Notice
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                This agent has access to external systems. Changes to permissions may affect system functionality and security. 
                Review all permissions carefully before saving.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionsPanel;