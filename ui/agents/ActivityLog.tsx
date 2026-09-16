import React, { useState } from 'react';
import { 
  Activity, 
  Filter, 
  Search, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Settings, 
  Shield,
  RefreshCw,
  Download
} from 'lucide-react';
import { useAgents, useAgentActivities, useSelectedAgent } from './AgentContext';
import { AgentActivity } from './AgentContext';

const ActivityLog: React.FC = () => {
  const { state } = useAgents();
  const selectedAgent = useSelectedAgent();
  const [filter, setFilter] = useState<'all' | 'execution' | 'error' | 'status_change' | 'permission_change'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | 'all'>('24h');

  // Get activities based on selected agent or all activities
  const allActivities = useAgentActivities(selectedAgent?.id);

  // Filter activities based on current filters
  const filteredActivities = React.useMemo(() => {
    let activities = allActivities;

    // Filter by type
    if (filter !== 'all') {
      activities = activities.filter(activity => activity.type === filter);
    }

    // Filter by search query
    if (searchQuery) {
      activities = activities.filter(activity =>
        activity.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.agentId.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by time range
    const now = new Date();
    const timeRangeMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      'all': Infinity
    };

    if (timeRange !== 'all') {
      const cutoff = new Date(now.getTime() - timeRangeMs[timeRange]);
      activities = activities.filter(activity => activity.timestamp >= cutoff);
    }

    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [allActivities, filter, searchQuery, timeRange]);

  const getActivityIcon = (type: AgentActivity['type']) => {
    switch (type) {
      case 'execution':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'status_change':
        return <Settings className="h-4 w-4 text-blue-500" />;
      case 'permission_change':
        return <Shield className="h-4 w-4 text-orange-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityColor = (type: AgentActivity['type']) => {
    switch (type) {
      case 'execution':
        return 'border-l-green-500 bg-green-50 dark:bg-green-900/20';
      case 'error':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'status_change':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'permission_change':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20';
      default:
        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-800';
    }
  };

  const getAgentName = (agentId: string) => {
    const agent = state.agents.find(a => a.id === agentId);
    return agent?.name || agentId;
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    
    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    } else {
      return timestamp.toLocaleDateString();
    }
  };

  const handleExportLog = () => {
    const dataStr = JSON.stringify(filteredActivities, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agent-activity-log-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Activity className="h-6 w-6 text-gray-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Activity Log
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedAgent 
                  ? `Showing activities for ${selectedAgent.name}`
                  : 'Showing activities for all agents'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportLog}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filteredActivities.length} activities
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search activities..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All Types</option>
              <option value="execution">Executions</option>
              <option value="error">Errors</option>
              <option value="status_change">Status Changes</option>
              <option value="permission_change">Permission Changes</option>
            </select>
          </div>

          {/* Time Range */}
          <div>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div>
            <button
              onClick={() => {
                setFilter('all');
                setSearchQuery('');
                setTimeRange('24h');
              }}
              className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {filteredActivities.length === 0 ? (
          <div className="p-8 text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Activities Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery || filter !== 'all' || timeRange !== 'all'
                ? 'Try adjusting your filters to see more activities.'
                : 'No agent activities have been recorded yet.'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className={`p-4 border-l-4 ${getActivityColor(activity.type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {getAgentName(activity.agentId)}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                          {activity.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {activity.message}
                      </p>
                      {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                            View metadata
                          </summary>
                          <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                            {JSON.stringify(activity.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="h-3 w-3" />
                    <span>{formatTimestamp(activity.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {filteredActivities.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-green-600">
              {filteredActivities.filter(a => a.type === 'execution').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Executions</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-red-600">
              {filteredActivities.filter(a => a.type === 'error').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Errors</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-blue-600">
              {filteredActivities.filter(a => a.type === 'status_change').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Status Changes</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-orange-600">
              {filteredActivities.filter(a => a.type === 'permission_change').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Permission Changes</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLog;