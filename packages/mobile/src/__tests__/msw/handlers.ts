import { http, HttpResponse } from 'msw';

const TRPC_BASE_URL = 'http://localhost:3002';

export const mockJobs = {
  assigned: {
    id: 'job_001',
    equipmentId: 'eq_001',
    customerId: 'cust_001',
    customerName: 'Acme Construction',
    issueDescription: 'Routine maintenance required',
    status: 'ASSIGNED',
    technicianId: 'tech_001',
    technicianName: 'Jake Morrison',
    assignedAt: new Date('2024-01-15T08:00:00Z'),
    createdAt: new Date('2024-01-15T07:00:00Z'),
    updatedAt: new Date('2024-01-15T08:00:00Z'),
    equipment: {
      id: 'eq_001',
      serialNumber: 'CAT-2021-001',
      make: 'Caterpillar',
      model: '320 Excavator',
      engineHours: 1250,
      projectSite: 'Downtown Construction Site',
      latitude: 40.7128,
      longitude: -74.0060,
    },
    serviceRecord: null,
  },
  inProgress: {
    id: 'job_002',
    equipmentId: 'eq_002',
    customerId: 'cust_002',
    customerName: 'BuildCo LLC',
    issueDescription: 'Hydraulic system check',
    status: 'IN_PROGRESS',
    technicianId: 'tech_001',
    technicianName: 'Jake Morrison',
    assignedAt: new Date('2024-01-14T09:00:00Z'),
    createdAt: new Date('2024-01-14T08:00:00Z'),
    updatedAt: new Date('2024-01-14T10:00:00Z'),
    equipment: {
      id: 'eq_002',
      serialNumber: 'JD-2020-042',
      make: 'John Deere',
      model: '644K Loader',
      engineHours: 2100,
      projectSite: 'Highway 101 Expansion',
      latitude: 40.7589,
      longitude: -73.9851,
    },
    serviceRecord: {
      id: 'sr_001',
      beforePhotos: ['https://example.com/photo1.jpg'],
      beforeNotes: 'Equipment operational, minor leak observed',
      beforeEngineHours: 2100,
      arrivedAt: new Date('2024-01-14T10:00:00Z'),
      isCheckInComplete: true,
      revisedAt: null,
      revisionCount: 0,
    },
  },
};

export const mockServiceRecord = {
  id: 'sr_001',
  jobId: 'job_002',
  beforePhotos: ['https://example.com/photo1.jpg'],
  beforeNotes: 'Equipment operational, minor leak observed',
  beforeEngineHours: 2100,
  arrivedAt: new Date('2024-01-14T10:00:00Z'),
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
  createdAt: new Date('2024-01-14T10:00:00Z'),
  updatedAt: new Date('2024-01-14T10:00:00Z'),
};

export const handlers = [
  http.get(`${TRPC_BASE_URL}/trpc/job.listActive`, ({ request }) => {
    const url = new URL(request.url);
    const input = url.searchParams.get('input');

    if (!input) {
      return HttpResponse.json({
        error: {
          message: 'Input required',
          code: -32600,
        },
      }, { status: 400 });
    }

    const parsedInput = JSON.parse(input);

    if (parsedInput.technicianId !== 'tech_001') {
      return HttpResponse.json({
        result: {
          data: [],
        },
      });
    }

    return HttpResponse.json({
      result: {
        data: [mockJobs.assigned, mockJobs.inProgress],
      },
    });
  }),

  http.get(`${TRPC_BASE_URL}/trpc/job.byId`, ({ request }) => {
    const url = new URL(request.url);
    const input = url.searchParams.get('input');

    if (!input) {
      return HttpResponse.json({
        error: {
          message: 'Input required',
          code: -32600,
        },
      }, { status: 400 });
    }

    const parsedInput = JSON.parse(input);
    const jobId = parsedInput.jobId;

    if (jobId === 'job_001') {
      return HttpResponse.json({
        result: {
          data: {
            ...mockJobs.assigned,
            equipment: {
              id: 'eq_001',
              serialNumber: 'CAT-2021-001',
              make: 'Caterpillar',
              model: '320 Excavator',
              engineHours: 1250,
              projectSite: 'Downtown Construction Site',
              latitude: 40.7128,
              longitude: -74.0060,
              status: 'OPERATIONAL',
              year: 2021,
              createdAt: new Date('2021-01-01T00:00:00Z'),
              updatedAt: new Date('2024-01-15T08:00:00Z'),
              lastInspectionAt: null,
            },
            serviceRecord: null,
          },
        },
      });
    }

    if (jobId === 'job_002') {
      return HttpResponse.json({
        result: {
          data: {
            ...mockJobs.inProgress,
            equipment: {
              id: 'eq_002',
              serialNumber: 'JD-2020-042',
              make: 'John Deere',
              model: '644K Loader',
              engineHours: 2100,
              projectSite: 'Highway 101 Expansion',
              latitude: 40.7589,
              longitude: -73.9851,
              status: 'OPERATIONAL',
              year: 2020,
              createdAt: new Date('2020-01-01T00:00:00Z'),
              updatedAt: new Date('2024-01-14T10:00:00Z'),
              lastInspectionAt: null,
            },
            serviceRecord: mockServiceRecord,
          },
        },
      });
    }

    return HttpResponse.json({
      error: {
        message: 'Job not found',
        code: -32004,
        data: {
          code: 'NOT_FOUND',
        },
      },
    }, { status: 404 });
  }),

  http.post(`${TRPC_BASE_URL}/trpc/serviceRecord.checkIn`, async ({ request }) => {
    const body = await request.json() as { jobId: string; beforePhotos: string[]; beforeNotes: string | null; beforeEngineHours: number; arrivedAt: string };

    if (!body.jobId) {
      return HttpResponse.json({
        error: {
          message: 'Job ID required',
          code: -32600,
        },
      }, { status: 400 });
    }

    if (body.jobId !== 'job_001') {
      return HttpResponse.json({
        error: {
          message: 'Job not found',
          code: -32004,
          data: {
            code: 'NOT_FOUND',
          },
        },
      }, { status: 404 });
    }

    const newServiceRecord = {
      id: 'sr_new_001',
      jobId: body.jobId,
      beforePhotos: body.beforePhotos,
      beforeNotes: body.beforeNotes,
      beforeEngineHours: body.beforeEngineHours,
      arrivedAt: new Date(body.arrivedAt),
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return HttpResponse.json({
      result: {
        data: newServiceRecord,
      },
    });
  }),

  http.post(`${TRPC_BASE_URL}/trpc/serviceRecord.complete`, async ({ request }) => {
    const body = await request.json() as {
      serviceRecordId: string;
      afterPhotos: string[];
      diagnosis: string;
      workPerformed: string;
      partsUsed: string | null;
      afterEngineHours: number;
      completedAt: string;
    };

    if (!body.serviceRecordId) {
      return HttpResponse.json({
        error: {
          message: 'Service record ID required',
          code: -32600,
        },
      }, { status: 400 });
    }

    if (body.serviceRecordId !== 'sr_001') {
      return HttpResponse.json({
        error: {
          message: 'Service record not found',
          code: -32004,
          data: {
            code: 'NOT_FOUND',
          },
        },
      }, { status: 404 });
    }

    const completedServiceRecord = {
      ...mockServiceRecord,
      afterPhotos: body.afterPhotos,
      diagnosis: body.diagnosis,
      workPerformed: body.workPerformed,
      partsUsed: body.partsUsed,
      afterEngineHours: body.afterEngineHours,
      completedAt: new Date(body.completedAt),
      isJobComplete: true,
      updatedAt: new Date(),
    };

    return HttpResponse.json({
      result: {
        data: completedServiceRecord,
      },
    });
  }),

  http.get(`${TRPC_BASE_URL}/trpc/job.listCompleted`, ({ request }) => {
    const url = new URL(request.url);
    const input = url.searchParams.get('input');

    if (!input) {
      return HttpResponse.json({
        error: {
          message: 'Input required',
          code: -32600,
        },
      }, { status: 400 });
    }

    return HttpResponse.json({
      result: {
        data: [],
      },
    });
  }),
];

export const errorHandlers = {
  networkError: http.get(`${TRPC_BASE_URL}/trpc/job.listActive`, () => {
    return HttpResponse.error();
  }),

  serverError: http.get(`${TRPC_BASE_URL}/trpc/job.listActive`, () => {
    return HttpResponse.json({
      error: {
        message: 'Internal server error',
        code: -32603,
      },
    }, { status: 500 });
  }),

  checkInAlreadyExists: http.post(`${TRPC_BASE_URL}/trpc/serviceRecord.checkIn`, () => {
    return HttpResponse.json({
      error: {
        message: 'Service record already exists for this job',
        code: -32003,
        data: {
          code: 'BAD_REQUEST',
        },
      },
    }, { status: 400 });
  }),
};
