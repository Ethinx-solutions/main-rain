import React, { useState } from 'react';
import { 
  Shield, 
  ExternalLink, 
  Activity, 
  Settings,
  Grid,
  List
} from 'lucide-react';

// Mock data for demonstration - in real app, this would come from the agent system
const mockAgents = [
  {
    id: '01-situation-analyst',
    name: 'Situation Analyst',
    purpose: 'Understand the customer\'s reality by analyzing intake answers and archetype data',
    version: '1.0.0',
    enabled: true,
    requiresExternalAccess: false,
    permissions: [],
    failures: 0,
    category: 'strategy',
    lastRun: new Date(Date.now() - 3600000),
    inputs: ['Intake answers', 'User archetype', 'Usage patterns'],
    outputs: ['Current Reality narrative', 'Key insights', 'Recommended focus areas']
  },
  {
    id: '07-stripe-fulfilment',
    name: 'Stripe Fulfilment Agent',
    purpose: 'React to payment events and handle subscription fulfillment',
    version: '1.0.0',
    enabled: true,
    requiresExternalAccess: true,
    permissions: ['stripe:read', 'stripe:webhooks', 'db:write', 'notifications:send'],
    failures: 0,
    category: 'external',
    lastRun: new Date(Date.now() - 1800000),
    inputs: ['Stripe webhook events', 'Payment status', 'Subscription data'],
    outputs: ['Fulfillment status', 'User access updates', 'Billing notifications']
  },
  {
    id: '08-supabase-data',
    name: 'Supabase Data Agent',
    purpose: 'Persist and retrieve customer artifacts with secure data operations',
    version: '1.0.0',
    enabled: true,
    requiresExternalAccess: true,
    permissions: ['supabase:read', 'supabase:write', 'storage:upload', 'storage:download'],
    failures: 1,
    category: 'external',
    lastRun: new Date(Date.now() - 7200000),
    inputs: ['User data', 'File uploads', 'Database queries'],
    outputs: ['Persisted data', 'Retrieved datasets', 'Signed URLs']
  },
  {
    id: '10-audit-compliance',
    name: 'Audit & Compliance Agent',
    purpose: 'Log everything immutable for legal and trust compliance',
    version: '1.0.0',
    enabled: false,
    requiresExternalAccess: true,
    permissions: ['audit:write', 'compliance:log', 'immutable:append'],
    failures: 0,
    category: 'external',
    lastRun: new Date(Date.now() - 86400000),
    inputs: ['System events', 'User actions', 'Agent executions'],
    outputs: ['Immutable logs', 'Compliance reports', 'Audit trails']
  }
];

const mockActivities = [
  {
    id: '1',
    agentId: '07-stripe-fulfilment',
    timestamp: new Date(Date.now() - 3600000),
    type: 'execution',
    message: 'Successfully processed payment webhook for subscription renewal',
    metadata: { amount: 29.99, customerId: 'cus_123' }
  },
  {
    id: '2',
    agentId: '08-supabase-data',
    timestamp: new Date(Date.now() - 7200000),
    type: 'error',
    message: 'Failed to upload file to storage bucket - connection timeout',
    metadata: { fileName: 'user_data.json', error: 'TIMEOUT' }
  },
  {
    id: '3',
    agentId: '10-audit-compliance',
    timestamp: new Date(Date.now() - 10800000),
    type: 'status_change',
    message: 'Agent disabled by administrator',
    metadata: { previousStatus: 'enabled', newStatus: 'disabled' }
  }
];

const Agents = () => {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [viewMode, setViewMode] = useState('grid');

  const externalAgents = mockAgents.filter(agent => agent.requiresExternalAccess);
  const internalAgents = mockAgents.filter(agent => !agent.requiresExternalAccess);

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'strategy':
        return <Shield className="h-4 w-4 text-blue-500" />;
      case 'content':
        return <Settings className="h-4 w-4 text-green-500" />;
      case 'external':
        return <ExternalLink className="h-4 w-4 text-orange-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (agent) => {
    if (!agent.enabled) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
          Disabled
        </span>
      );
    }
    
    if (agent.failures > 0) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          {agent.failures} Failures
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        Active
      </span>
    );
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    
    if (diff < 60000) {
      return 'Just now';
    } else if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    } else if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    } else {
      return timestamp.toLocaleDateString();
    }
  };

  const toggleAgent = (agentId) => {
    // In real app, this would make an API call
    console.log('Toggle agent:', agentId);
  };

  const AgentCard = ({ agent }) => (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer ${
        selectedAgent?.id === agent.id ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={() => setSelectedAgent(agent)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getCategoryIcon(agent.category)}
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            {agent.name}
          </h3>
        </div>
        {getStatusBadge(agent)}
      </div>
      
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
        {agent.purpose}
      </p>
      
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>v{agent.version}</span>
        {agent.requiresExternalAccess && (
          <span className="flex items-center">
            <ExternalLink className="h-3 w-3 mr-1" />
            {agent.permissions.length} perms
          </span>
        )}
      </div>
      
      {agent.lastRun && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Last run: {formatTimestamp(agent.lastRun)}
        </div>
      )}
    </div>
  );

  const AgentListItem = ({ agent }) => (
    <div 
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
        selectedAgent?.id === agent.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : ''
      }`}
      onClick={() => setSelectedAgent(agent)}
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
              {agent.requiresExternalAccess && (
                <span>{agent.permissions.length} permissions</span>
              )}
              {agent.lastRun && (
                <span>Last run: {formatTimestamp(agent.lastRun)}</span>
              )}
            </div>
          </div>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleAgent(agent.id);
          }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            agent.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
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
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Agent Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage Copilot agents with external data access
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {mockAgents.filter(a => a.enabled).length} of {mockAgents.length} active
          </div>
        </div>
      </div>

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
          <div className="text-2xl font-bold text-red-600">{mockAgents.filter(a => a.failures > 0).length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">With Failures</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-600">{mockActivities.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Recent Activities</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent List */}
        <div className="lg:col-span-2 space-y-4">
          {/* External Access Agents */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <ExternalLink className="h-5 w-5 text-orange-500 mr-2" />
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
            
            <div className={viewMode === 'grid' ? 'p-4 grid grid-cols-1 md:grid-cols-2 gap-4' : 'divide-y divide-gray-200 dark:divide-gray-700'}>
              {externalAgents.map((agent) => (
                viewMode === 'grid' ? (
                  <AgentCard key={agent.id} agent={agent} />
                ) : (
                  <AgentListItem key={agent.id} agent={agent} />
                )
              ))}
            </div>
          </div>

          {/* Internal Agents */}
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
            
            <div className={viewMode === 'grid' ? 'p-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-200 dark:border-gray-700' : 'divide-y divide-gray-200 dark:divide-gray-700 border-t border-gray-200 dark:border-gray-700'}>
              {internalAgents.map((agent) => (
                viewMode === 'grid' ? (
                  <AgentCard key={agent.id} agent={agent} />
                ) : (
                  <AgentListItem key={agent.id} agent={agent} />
                )
              ))}
            </div>
          </details>
        </div>

        {/* Agent Detail Panel */}
        <div className="lg:col-span-1">
          {selectedAgent ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 sticky top-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  {getCategoryIcon(selectedAgent.category)}
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {selectedAgent.name}
                  </h3>
                </div>
                {getStatusBadge(selectedAgent)}
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {selectedAgent.purpose}
              </p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Configuration
                  </h4>
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <div>Version: {selectedAgent.version}</div>
                    <div>Category: {selectedAgent.category}</div>
                    <div>External Access: {selectedAgent.requiresExternalAccess ? 'Yes' : 'No'}</div>
                    {selectedAgent.lastRun && (
                      <div>Last Run: {selectedAgent.lastRun.toLocaleString()}</div>
                    )}
                  </div>
                </div>
                
                {selectedAgent.requiresExternalAccess && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Permissions ({selectedAgent.permissions.length})
                    </h4>
                    <div className="space-y-1">
                      {selectedAgent.permissions.map((permission, index) => (
                        <div key={index} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {permission}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Inputs
                  </h4>
                  <div className="space-y-1">
                    {selectedAgent.inputs.map((input, index) => (
                      <div key={index} className="text-xs text-gray-600 dark:text-gray-400">
                        • {input}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Outputs
                  </h4>
                  <div className="space-y-1">
                    {selectedAgent.outputs.map((output, index) => (
                      <div key={index} className="text-xs text-gray-600 dark:text-gray-400">
                        • {output}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Agent Selected
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Select an agent to view its details and configuration
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Activity className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Recent Activity
            </h3>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {mockActivities.map((activity) => {
            const agent = mockAgents.find(a => a.id === activity.agentId);
            return (
              <div key={activity.id} className="p-4">
                <div className="flex items-start space-x-3">
                  <div className={`p-1 rounded-full ${
                    activity.type === 'execution' ? 'bg-green-100 dark:bg-green-900' :
                    activity.type === 'error' ? 'bg-red-100 dark:bg-red-900' :
                    'bg-blue-100 dark:bg-blue-900'
                  }`}>
                    {activity.type === 'execution' ? (
                      <Activity className="h-3 w-3 text-green-600 dark:text-green-400" />
                    ) : activity.type === 'error' ? (
                      <ExternalLink className="h-3 w-3 text-red-600 dark:text-red-400" />
                    ) : (
                      <Settings className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {agent?.name || activity.agentId}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {activity.message}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Agents;