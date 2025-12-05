export const DIRECTIVE_TYPES = [
  { id: 'operational-order', label: 'Operational Order', icon: 'FileText' },
  { id: 'situation-update', label: 'Situation Update', icon: 'AlertTriangle' },
  { id: 'resource-alert', label: 'Resource Alert', icon: 'Package' },
  { id: 'time-call', label: 'Time Call', icon: 'Clock' },
  { id: 'stand-down', label: 'Stand Down', icon: 'Square' },
] as const;

export type DirectiveType = (typeof DIRECTIVE_TYPES)[number]['id'];
