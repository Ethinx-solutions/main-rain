import React from 'react';
import { 
  Shield, 
  ExternalLink, 
  Power, 
  PowerOff, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Settings,
  Info,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { useAgents, useSelectedAgent } from './AgentContext';

const AgentDetail: React.FC = () => {
  const { state, dispatch } = useAgents();
  const selectedAgent = useSelectedAgent();

  if (!selectedAgent) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Agent Selected
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Select an agent from the list to view its details and configuration
        </p>
      </div>
    );
  }

  const handleToggleAgent = () => {
    dispatch({ type: 'TOGGLE_AGENT', payload: selectedAgent.id });
  };

  const handleResetFailures = () => {
    dispatch({ type: 'RESET_FAILURES', payload: selectedAgent.id });
  };

  const getCategoryBadge = () => {
    const colors = {
      strategy: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      content: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      external: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[selectedAgent.category]}`}>
        {selectedAgent.category.charAt(0).toUpperCase() + selectedAgent.category.slice(1)}
      </span>
    );
  };

  const getStatusIcon = () => {
    if (!selectedAgent.enabled) {
      return <PowerOff className="h-5 w-5 text-gray-400" />;
    }
    if (selectedAgent.failures > 0) {
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              {selectedAgent.requiresExternalAccess ? (
                <ExternalLink className="h-6 w-6 text-orange-500" />
              ) : (
                <Shield className="h-6 w-6 text-blue-500" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedAgent.name}
                </h2>
                {getCategoryBadge()}
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-3">
                {selectedAgent.purpose}
              </p>
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <span>Version {selectedAgent.version}</span>
                <span>•</span>
                <span>ID: {selectedAgent.id}</span>
                {selectedAgent.lastRun && (
                  <>
                    <span>•</span>
                    <span>Last run: {selectedAgent.lastRun.toLocaleString()}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <button
              onClick={handleToggleAgent}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedAgent.enabled
                  ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800'
                  : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800'
              }`}
            >
              {selectedAgent.enabled ? (
                <>
                  <PowerOff className="h-4 w-4 mr-2 inline" />
                  Disable
                </>
              ) : (
                <>
                  <Power className="h-4 w-4 mr-2 inline" />
                  Enable
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Settings className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Configuration
            </h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <span className={`text-sm ${
                  selectedAgent.enabled 
                    ? selectedAgent.failures > 0 
                      ? 'text-red-600 dark:text-red-400' 
                      : 'text-green-600 dark:text-green-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {selectedAgent.enabled 
                    ? selectedAgent.failures > 0 
                      ? `Active with ${selectedAgent.failures} failures`
                      : 'Active and healthy'
                    : 'Disabled'
                  }
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                External Access
              </label>
              <div className="flex items-center space-x-2">
                {selectedAgent.requiresExternalAccess ? (
                  <>
                    <ExternalLink className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-orange-600 dark:text-orange-400">
                      Requires external permissions
                    </span>
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-blue-600 dark:text-blue-400">
                      Internal only
                    </span>
                  </>
                )}
              </div>
            </div>

            {selectedAgent.failures > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Failure Recovery
                </label>
                <button
                  onClick={handleResetFailures}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Failure Count
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Permissions */}
        {selectedAgent.requiresExternalAccess && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <Shield className="h-5 w-5 text-gray-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                External Permissions
              </h3>
            </div>
            
            <div className="space-y-3">
              {selectedAgent.permissions.map((permission, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {permission}
                    </span>
                  </div>
                </div>
              ))}
              
              {selectedAgent.permissions.length === 0 && (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  <Info className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No permissions configured</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input/Output Specification */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <ArrowRight className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Inputs
            </h3>
          </div>
          
          <div className="space-y-2">
            {selectedAgent.inputs.map((input, index) => (
              <div key={index} className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-900 dark:text-white">{input}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Outputs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <ArrowLeft className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Outputs
            </h3>
          </div>
          
          <div className="space-y-2">
            {selectedAgent.outputs.map((output, index) => (
              <div key={index} className="flex items-center space-x-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-md">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-900 dark:text-white">{output}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentDetail;