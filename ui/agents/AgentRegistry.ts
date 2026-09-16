export interface Agent {
  id: string;
  name: string;
  purpose: string;
  version: string;
  enabled: boolean;
  requiresExternalAccess: boolean;
  permissions: string[];
  lastRun?: Date;
  failures: number;
  category: 'strategy' | 'content' | 'external';
  inputs: string[];
  outputs: string[];
}

export const AGENT_REGISTRY: Agent[] = [
  // Strategy & Diagnosis Agents (Internal)
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
    inputs: ['Intake answers', 'User archetype', 'Usage patterns'],
    outputs: ['Current Reality narrative', 'Key insights', 'Recommended focus areas']
  },
  {
    id: '02-leverage-mapper',
    name: 'Leverage Mapper',
    purpose: 'Identify highest leverage shift opportunities and create impact mapping',
    version: '1.0.0',
    enabled: true,
    requiresExternalAccess: false,
    permissions: [],
    failures: 0,
    category: 'strategy',
    inputs: ['Situation analysis', 'User goals', 'Workflow inefficiencies'],
    outputs: ['Business Leverage Map', 'Priority areas', 'Quick wins']
  },
  {
    id: '03-priority-governor',
    name: 'Priority Governor',
    purpose: 'Decide what not to do and lock channel + action decisions',
    version: '1.0.0',
    enabled: true,
    requiresExternalAccess: false,
    permissions: [],
    failures: 0,
    category: 'strategy',
    inputs: ['All prior outputs', 'Resource constraints'],
    outputs: ['Locked channel decisions', 'Action priorities', 'Exclusion list']
  },
  
  // Content & Copy Agents (Internal)
  {
    id: '04-traffic-copywriter',
    name: 'Traffic Copywriter',
    purpose: 'Generate traffic angles and entry points for user acquisition',
    version: '1.0.0',
    enabled: true,
    requiresExternalAccess: false,
    permissions: [],
    failures: 0,
    category: 'content',
    inputs: ['Target audience', 'Value propositions', 'Channel requirements'],
    outputs: ['Hooks', 'Openers', 'Traffic angles']
  },
  {
    id: '05-followup-copywriter',
    name: 'Follow-Up Copywriter',
    purpose: 'Write follow-up sequences and nurture communications',
    version: '1.0.0',
    enabled: true,
    requiresExternalAccess: false,
    permissions: [],
    failures: 0,
    category: 'content',
    inputs: ['User journey stage', 'Previous interactions', 'Goals'],
    outputs: ['Message sequences', 'Subject lines', 'CTAs']
  },
  {
    id: '06-conversion-architect',
    name: 'Conversion Architect',
    purpose: 'Shape offer and decision nudges for conversion optimization',
    version: '1.0.0',
    enabled: true,
    requiresExternalAccess: false,
    permissions: [],
    failures: 0,
    category: 'content',
    inputs: ['User intent', 'Conversion goals', 'Offer structure'],
    outputs: ['Offer framing', 'Decision nudges', 'Conversion flows']
  },
  
  // Externally-Permissioned Agents
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
    failures: 0,
    category: 'external',
    inputs: ['User data', 'File uploads', 'Database queries'],
    outputs: ['Persisted data', 'Retrieved datasets', 'Signed URLs']
  },
  {
    id: '09-deployment-executor',
    name: 'Deployment Executor',
    purpose: 'Track and coordinate manual deployments with human oversight',
    version: '1.0.0',
    enabled: true,
    requiresExternalAccess: true,
    permissions: ['admin:notify', 'deployment:status', 'system:monitor'],
    failures: 0,
    category: 'external',
    inputs: ['Deployment requests', 'Manual tasks', 'System status'],
    outputs: ['Deployment status', 'Notifications', 'Completion tracking']
  },
  {
    id: '10-audit-compliance',
    name: 'Audit & Compliance Agent',
    purpose: 'Log everything immutable for legal and trust compliance',
    version: '1.0.0',
    enabled: true,
    requiresExternalAccess: true,
    permissions: ['audit:write', 'compliance:log', 'immutable:append'],
    failures: 0,
    category: 'external',
    inputs: ['System events', 'User actions', 'Agent executions'],
    outputs: ['Immutable logs', 'Compliance reports', 'Audit trails']
  }
];

export const getAgentById = (id: string): Agent | undefined => {
  return AGENT_REGISTRY.find(agent => agent.id === id);
};

export const getExternalAgents = (): Agent[] => {
  return AGENT_REGISTRY.filter(agent => agent.requiresExternalAccess);
};

export const getInternalAgents = (): Agent[] => {
  return AGENT_REGISTRY.filter(agent => !agent.requiresExternalAccess);
};

export const getAgentsByCategory = (category: Agent['category']): Agent[] => {
  return AGENT_REGISTRY.filter(agent => agent.category === category);
};