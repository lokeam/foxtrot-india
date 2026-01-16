import { Platform } from 'react-native';

// Android emulators use 10.0.2.2 to access host machine's localhost
const getApiUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3002/trpc';
  }
  return 'http://localhost:3002/trpc';
};

export const API_URL = getApiUrl();

export const INSPECTOR_NAME = 'Jake Morrison';
export const TECHNICIAN_ID = 'tech_001';
export const TECHNICIAN_NAME = 'Jake Morrison';

// Heave Brand Colors
export const COLORS = {
  // Primary
  PRIMARY_YELLOW: '#FDB913',
  PRIMARY_YELLOW_DARK: '#E5A610',

  // Backgrounds
  BACKGROUND_DARK: '#000000',
  BACKGROUND_LIGHT: '#FFFFFF',
  BACKGROUND_GRAY: '#F9FAFB',

  // Text
  TEXT_PRIMARY: '#1F2937',
  TEXT_SECONDARY: '#6B7280',
  TEXT_TERTIARY: '#9CA3AF',
  TEXT_ON_DARK: '#FFFFFF',
  TEXT_ON_YELLOW: '#000000',

  // Borders & Dividers
  BORDER_LIGHT: '#E5E7EB',
  BORDER_MEDIUM: '#D1D5DB',

  // Status Colors (keep existing for equipment/job status)
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
  INFO: '#3b82f6',
} as const;

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

export const JOB_STATUS = {
  PENDING: 'Pending',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
} as const;

export const JOB_STATUS_COLORS = {
  PENDING: '#6b7280',
  ASSIGNED: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  COMPLETED: '#10b981',
  CANCELLED: '#ef4444',
} as const;
