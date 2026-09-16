import React from 'react';
import { 
  Shield, 
  ShieldCheck, 
  Power, 
  PowerOff, 
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { useAgents } from './AgentContext';
import { Agent } from './AgentRegistry';

const AgentList: React.FC = () => {
  const { state, dispatch } = useAgents();

  const handleSelectAgent = (agentId: string) => {
    dispatch({ type: 'SELECT_AGENT', payload: agentId });
  };

  const handleToggleAgent = (agentId: string) => {
    dispatch({ type: 'TOGGLE_AGENT', payload: agentId });
  };

  const getCategoryIcon = (category: Agent['category']) => {
    switch (category) {
      case 'strategy':
        return <Shield className="h-4 w-4 text-blue-500" />;
      case 'content':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'external':
        return <ExternalLink className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (agent: Agent) => {
    if (!agent.enabled) return 'text-gray-400';
    if (agent.failures > 0) return 'text-red-500';
    return 'text-green-500';
  };

  const getStatusBadge = (agent: Agent) => {
    if (!agent.enabled) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
          <PowerOff className="h-3 w-3 mr-1" />
          Disabled
        </span>
      );
    }
    
    if (agent.failures > 0) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {agent.failures} Failures
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <Power className="h-3 w-3 mr-1" />
        Active
      </span>
    );
  };

  const externalAgents = state.agents.filter(agent => agent.requiresExternalAccess);
  const internalAgents = state.agents.filter(agent => !agent.requiresExternalAccess);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Agent Management
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage Copilot agents with external data access
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {state.agents.filter(a => a.enabled).length} of {state.agents.length} agents active
        </div>
      </div>

      {/* External Access Agents */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <ShieldCheck className="h-5 w-5 text-orange-500 mr-2" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              External Data Access Required
            </h3>
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
              ({externalAgents.length} agents)
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Only agents that require permissions for external data access appear here
          </p>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {externalAgents.map((agent) => (
            <div
              key={agent.id}
              className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                state.selectedAgentId === agent.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
              onClick={() => handleSelectAgent(agent.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getCategoryIcon(agent.category)}
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {agent.name}
                      </h4>
                      {getStatusBadge(agent)}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {agent.purpose}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>v{agent.version}</span>
                      <span>{agent.permissions.length} permissions</span>
                      {agent.lastRun && (
                        <span>Last run: {agent.lastRun.toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleAgent(agent.id);
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      agent.enabled
                        ? 'bg-blue-600'
                        : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        agent.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Internal Agents (Collapsed by default) */}
      <details className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <div className="flex items-center">
            <Shield className="h-5 w-5 text-blue-500 mr-2" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Internal Agents
            </h3>
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
              ({internalAgents.length} agents - no external access)
            </span>
          </div>
        </summary>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700 border-t border-gray-200 dark:border-gray-700">
          {internalAgents.map((agent) => (
            <div
              key={agent.id}
              className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                state.selectedAgentId === agent.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
              onClick={() => handleSelectAgent(agent.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getCategoryIcon(agent.category)}
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {agent.name}
                      </h4>
                      {getStatusBadge(agent)}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {agent.purpose}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>v{agent.version}</span>
                      <span>Internal only</span>
                      {agent.lastRun && (
                        <span>Last run: {agent.lastRun.toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleAgent(agent.id);
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      agent.enabled
                        ? 'bg-blue-600'
                        : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        agent.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </details>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-blue-600">{externalAgents.filter(a => a.enabled).length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">External Active</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-green-600">{internalAgents.filter(a => a.enabled).length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Internal Active</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-red-600">{state.agents.filter(a => a.failures > 0).length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">With Failures</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-600">{state.activities.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Activities</div>
        </div>
      </div>
    </div>
  );
};

export default AgentList;