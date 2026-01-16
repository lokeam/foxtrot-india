export const API_URL = 'http://localhost:3002/trpc';

export const INSPECTOR_NAME = 'Jake Morrison';

export const EQUIPMENT_STATUS = {
  OPERATIONAL: 'Operational',
  NEEDS_SERVICE: 'Needs Service',
  BROKEN: 'Broken',
  IN_REPAIR: 'In Repair',
} as const;

export const EQUIPMENT_STATUS_COLORS = {
  OPERATIONAL: '#10b981',
  NEEDS_SERVICE: '#f59e0b',
  BROKEN: '#ef4444',
  IN_REPAIR: '#3b82f6',
} as const;
