import { Job, ServiceRecord, Equipment, JobStatus, EquipmentStatus } from '@prisma/client';

// Test data factories
export const createMockJob = (overrides?: Partial<Job>): Job => ({
  id: 'cljk1234567890',
  equipmentId: 'cljk0987654321',
  customerId: 'cust_001',
  customerName: 'Acme Construction',
  siteAddress: '123 Main St, City, State 12345',
  contactName: 'John Doe',
  contactPhone: '555-0100',
  contactEmail: 'john@acme.com',
  issueDescription: 'Hydraulic leak on excavator',
  status: JobStatus.ASSIGNED,
  technicianId: 'tech_001',
  technicianName: 'Jake Morrison',
  assignedAt: new Date('2024-01-15T08:00:00Z'),
  createdAt: new Date('2024-01-15T07:00:00Z'),
  updatedAt: new Date('2024-01-15T08:00:00Z'),
  ...overrides,
});

export const createMockServiceRecord = (overrides?: Partial<ServiceRecord>): ServiceRecord => ({
  id: 'clsr1234567890',
  jobId: 'cljk1234567890',
  beforePhotos: ['http://localhost:8000/photo1.jpg'],
  beforeNotes: 'Equipment shows signs of hydraulic fluid leak',
  beforeEngineHours: 1250,
  arrivedAt: new Date('2024-01-15T09:00:00Z'),
  isCheckInComplete: true,
  afterPhotos: [],
  diagnosis: null,
  workPerformed: null,
  partsUsed: null,
  afterEngineHours: null,
  completedAt: null,
  isJobComplete: false,
  revisedAt: null,
  revisionCount: 0,
  createdAt: new Date('2024-01-15T09:00:00Z'),
  updatedAt: new Date('2024-01-15T09:00:00Z'),
  ...overrides,
});

export const createMockEquipment = (overrides?: Partial<Equipment>): Equipment => ({
  id: 'cljk0987654321',
  serialNumber: 'CAT336-12345',
  make: 'Caterpillar',
  model: '336 Excavator',
  status: EquipmentStatus.OPERATIONAL,
  engineHours: 1250,
  projectSite: 'Downtown Construction Site',
  latitude: 40.7128,
  longitude: -74.0060,
  lastInspectionAt: new Date('2024-01-10T10:00:00Z'),
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-15T08:00:00Z'),
  ...overrides,
});

// Helper to create complete job with relations
export const createMockJobWithRelations = (overrides?: {
  job?: Partial<Job>;
  equipment?: Partial<Equipment>;
  serviceRecord?: Partial<ServiceRecord> | null;
}): Job & { equipment: Equipment; serviceRecord: ServiceRecord | null } => {
  const equipment = createMockEquipment(overrides?.equipment);
  const job = createMockJob({ equipmentId: equipment.id, ...overrides?.job });
  const serviceRecord = overrides?.serviceRecord === null
    ? null
    : createMockServiceRecord({ jobId: job.id, ...overrides?.serviceRecord });

  return {
    ...job,
    equipment,
    serviceRecord,
  };
};
