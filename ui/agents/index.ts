// Agent Control UI - Clean re-exports
export { AgentProvider, useAgents, useSelectedAgent, useAgentActivities, useExternalAgents } from './AgentContext';
export { AGENT_REGISTRY, getAgentById, getExternalAgents, getInternalAgents, getAgentsByCategory } from './AgentRegistry';
export { default as AgentList } from './AgentList';
export { default as AgentDetail } from './AgentDetail';
export { default as PermissionsPanel } from './PermissionsPanel';
export { default as ActivityLog } from './ActivityLog';

// Types
export type { Agent } from './AgentRegistry';
export type { AgentState, AgentAction, AgentActivity } from './AgentContext';