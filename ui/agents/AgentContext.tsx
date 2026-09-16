import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Agent, AGENT_REGISTRY } from './AgentRegistry';

export interface AgentActivity {
  id: string;
  agentId: string;
  timestamp: Date;
  type: 'execution' | 'error' | 'status_change' | 'permission_change';
  message: string;
  metadata?: Record<string, any>;
}

export interface AgentState {
  agents: Agent[];
  selectedAgentId: string | null;
  activities: AgentActivity[];
  isLoading: boolean;
  error: string | null;
}

export type AgentAction =
  | { type: 'SELECT_AGENT'; payload: string | null }
  | { type: 'TOGGLE_AGENT'; payload: string }
  | { type: 'UPDATE_PERMISSIONS'; payload: { agentId: string; permissions: string[] } }
  | { type: 'ADD_ACTIVITY'; payload: AgentActivity }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_FAILURES'; payload: string };

const initialState: AgentState = {
  agents: AGENT_REGISTRY.map(agent => ({ ...agent })),
  selectedAgentId: null,
  activities: [
    // Sample activities for demo
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
      type: 'execution',
      message: 'Persisted user artifacts to storage bucket',
      metadata: { fileCount: 3, totalSize: '2.4MB' }
    },
    {
      id: '3',
      agentId: '01-situation-analyst',
      timestamp: new Date(Date.now() - 10800000),
      type: 'execution',
      message: 'Generated situation analysis for new user onboarding',
      metadata: { userId: 'user_456', insights: 5 }
    }
  ],
  isLoading: false,
  error: null
};

function agentReducer(state: AgentState, action: AgentAction): AgentState {
  switch (action.type) {
    case 'SELECT_AGENT':
      return {
        ...state,
        selectedAgentId: action.payload
      };

    case 'TOGGLE_AGENT':
      return {
        ...state,
        agents: state.agents.map(agent =>
          agent.id === action.payload
            ? { ...agent, enabled: !agent.enabled }
            : agent
        ),
        activities: [
          ...state.activities,
          {
            id: Date.now().toString(),
            agentId: action.payload,
            timestamp: new Date(),
            type: 'status_change',
            message: `Agent ${state.agents.find(a => a.id === action.payload)?.enabled ? 'disabled' : 'enabled'}`,
            metadata: {}
          }
        ]
      };

    case 'UPDATE_PERMISSIONS':
      return {
        ...state,
        agents: state.agents.map(agent =>
          agent.id === action.payload.agentId
            ? { ...agent, permissions: action.payload.permissions }
            : agent
        ),
        activities: [
          ...state.activities,
          {
            id: Date.now().toString(),
            agentId: action.payload.agentId,
            timestamp: new Date(),
            type: 'permission_change',
            message: `Permissions updated: ${action.payload.permissions.join(', ')}`,
            metadata: { permissions: action.payload.permissions }
          }
        ]
      };

    case 'ADD_ACTIVITY':
      return {
        ...state,
        activities: [action.payload, ...state.activities].slice(0, 100) // Keep last 100 activities
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };

    case 'RESET_FAILURES':
      return {
        ...state,
        agents: state.agents.map(agent =>
          agent.id === action.payload
            ? { ...agent, failures: 0 }
            : agent
        ),
        activities: [
          ...state.activities,
          {
            id: Date.now().toString(),
            agentId: action.payload,
            timestamp: new Date(),
            type: 'status_change',
            message: 'Failure count reset to 0',
            metadata: {}
          }
        ]
      };

    default:
      return state;
  }
}

const AgentContext = createContext<{
  state: AgentState;
  dispatch: React.Dispatch<AgentAction>;
} | null>(null);

export function AgentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(agentReducer, initialState);

  return (
    <AgentContext.Provider value={{ state, dispatch }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgents() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgents must be used within an AgentProvider');
  }
  return context;
}

// Helper hooks for common operations
export function useSelectedAgent() {
  const { state } = useAgents();
  return state.agents.find(agent => agent.id === state.selectedAgentId) || null;
}

export function useAgentActivities(agentId?: string) {
  const { state } = useAgents();
  return agentId 
    ? state.activities.filter(activity => activity.agentId === agentId)
    : state.activities;
}

export function useExternalAgents() {
  const { state } = useAgents();
  return state.agents.filter(agent => agent.requiresExternalAccess);
}