import React from 'react';
import { Alert } from 'react-native';
import { renderWithIntegration, waitFor, screen } from '../integration-utils';
import { CheckInScreen } from '../../screens/CheckInScreen';
import { CompleteJobScreen } from '../../screens/CompleteJobScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { server } from '../msw/server';
import { http, HttpResponse } from 'msw';

jest.unmock('../../utils/trpc');

jest.spyOn(Alert, 'alert');

const TRPC_BASE_URL = 'http://localhost:3002';

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

(useNavigation as jest.Mock).mockReturnValue(mockNavigation);

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;

function seedDraft(key: string, data: Record<string, unknown>): void {
  const json = JSON.stringify(data);
  mockGetItem.mockImplementation((k: string) =>
    Promise.resolve(k === key ? json : null)
  );
}

function mockJobByIdHandler(jobId: string, status: string, serviceRecord: any = null) {
  return http.get(`${TRPC_BASE_URL}/trpc/job.byId`, ({ request }) => {
    const url = new URL(request.url);
    const input = url.searchParams.get('input');
    if (!input) {
      return HttpResponse.json({ error: { message: 'Input required', code: -32600 } }, { status: 400 });
    }

    const parsedInput = JSON.parse(input);
    if (parsedInput.jobId !== jobId) {
      return HttpResponse.json(
        { error: { message: 'Job not found', code: -32004, data: { code: 'NOT_FOUND' } } },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      result: {
        data: {
          id: jobId,
          equipmentId: 'eq_test',
          customerId: 'cust_test',
          customerName: 'Test Customer',
          issueDescription: 'Test issue',
          status,
          technicianId: 'tech_001',
          technicianName: 'Jake Morrison',
          assignedAt: new Date('2024-01-15T08:00:00Z'),
          createdAt: new Date('2024-01-15T07:00:00Z'),
          updatedAt: new Date('2024-01-15T08:00:00Z'),
          equipment: {
            id: 'eq_test',
            serialNumber: 'TEST-001',
            make: 'Test',
            model: 'Test Model',
            engineHours: 1000,
            projectSite: 'Test Site',
            latitude: 40.0,
            longitude: -74.0,
            status: 'OPERATIONAL',
            year: 2021,
            createdAt: new Date('2021-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-15T08:00:00Z'),
            lastInspectionAt: null,
          },
          serviceRecord,
        },
      },
    });
  });
}

function mockJobByIdNetworkError() {
  return http.get(`${TRPC_BASE_URL}/trpc/job.byId`, () => {
    return HttpResponse.error();
  });
}

describe('Zombie Draft Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockImplementation(() => Promise.resolve(null));
  });

  describe('CheckInScreen', () => {
    it('should clear zombie draft silently when job is IN_PROGRESS', async () => {
      const jobId = 'test_job_1';
      const draftKey = `draft_checkin_${jobId}`;

      seedDraft(draftKey, {
        beforeNotes: 'Zombie draft notes',
        beforeEngineHours: '1200',
        photos: [],
      });

      server.use(mockJobByIdHandler(jobId, 'IN_PROGRESS'));

      const mockRoute = { params: { jobId, equipmentId: 'eq_test' } };
      (useRoute as jest.Mock).mockReturnValue(mockRoute);

      renderWithIntegration(
        <CheckInScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(mockRemoveItem).toHaveBeenCalledWith(draftKey);
      });

      expect(Alert.alert).not.toHaveBeenCalledWith(
        'Resume Draft?',
        expect.any(String),
        expect.any(Array)
      );

      expect(screen.getByPlaceholderText(/equipment condition/i)).toBeTruthy();
    });

    it('should clear zombie draft silently when job is COMPLETED', async () => {
      const jobId = 'test_job_1';
      const draftKey = `draft_checkin_${jobId}`;

      seedDraft(draftKey, {
        beforeNotes: 'Zombie draft notes',
        beforeEngineHours: '1200',
        photos: [],
      });

      server.use(mockJobByIdHandler(jobId, 'COMPLETED'));

      const mockRoute = { params: { jobId, equipmentId: 'eq_test' } };
      (useRoute as jest.Mock).mockReturnValue(mockRoute);

      renderWithIntegration(
        <CheckInScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(mockRemoveItem).toHaveBeenCalledWith(draftKey);
      });

      expect(Alert.alert).not.toHaveBeenCalledWith(
        'Resume Draft?',
        expect.any(String),
        expect.any(Array)
      );

      expect(screen.getByPlaceholderText(/equipment condition/i)).toBeTruthy();
    });

    it('should offer valid draft for resumption when job is ASSIGNED', async () => {
      const jobId = 'test_job_2';
      const draftKey = `draft_checkin_${jobId}`;

      seedDraft(draftKey, {
        beforeNotes: 'Valid draft notes',
        beforeEngineHours: '1500',
        photos: [],
      });

      server.use(mockJobByIdHandler(jobId, 'ASSIGNED'));

      const mockRoute = { params: { jobId, equipmentId: 'eq_test' } };
      (useRoute as jest.Mock).mockReturnValue(mockRoute);

      renderWithIntegration(
        <CheckInScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Resume Draft?',
          expect.any(String),
          expect.any(Array)
        );
      });

      expect(mockRemoveItem).not.toHaveBeenCalledWith(draftKey);
    });

    it('should fail open and show resume alert when status fetch fails', async () => {
      const jobId = 'test_job_3';
      const draftKey = `draft_checkin_${jobId}`;

      seedDraft(draftKey, {
        beforeNotes: 'Draft with network error',
        beforeEngineHours: '1100',
        photos: [],
      });

      server.use(mockJobByIdNetworkError());

      const mockRoute = { params: { jobId, equipmentId: 'eq_test' } };
      (useRoute as jest.Mock).mockReturnValue(mockRoute);

      renderWithIntegration(
        <CheckInScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Resume Draft?',
          expect.any(String),
          expect.any(Array)
        );
      });
    });
  });

  describe('CompleteJobScreen', () => {
    it('should clear zombie draft silently when job is COMPLETED', async () => {
      const jobId = 'test_job_1';
      const serviceRecordId = 'test_record_1';
      const draftKey = `draft_complete_${serviceRecordId}`;

      seedDraft(draftKey, {
        diagnosis: 'Zombie diagnosis',
        workPerformed: 'Zombie work',
        partsUsed: '',
        afterEngineHours: '2200',
        photos: [],
      });

      server.use(mockJobByIdHandler(jobId, 'COMPLETED', {
        id: serviceRecordId,
        beforePhotos: ['https://example.com/photo1.jpg'],
        beforeNotes: 'Before notes',
        beforeEngineHours: 2100,
        arrivedAt: new Date('2024-01-14T10:00:00Z').toISOString(),
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
      }));

      const mockRoute = { params: { jobId, serviceRecordId, isEditMode: false } };
      (useRoute as jest.Mock).mockReturnValue(mockRoute);

      renderWithIntegration(
        <CompleteJobScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(mockRemoveItem).toHaveBeenCalledWith(draftKey);
      });

      expect(Alert.alert).not.toHaveBeenCalledWith(
        'Resume Draft?',
        expect.any(String),
        expect.any(Array)
      );
    });

    it('should fail open and show resume alert when status fetch fails', async () => {
      const jobId = 'test_job_1';
      const serviceRecordId = 'test_record_1';
      const draftKey = `draft_complete_${serviceRecordId}`;

      seedDraft(draftKey, {
        diagnosis: 'Draft diagnosis',
        workPerformed: 'Draft work',
        partsUsed: '',
        afterEngineHours: '2200',
        photos: [],
      });

      server.use(mockJobByIdNetworkError());

      const mockRoute = { params: { jobId, serviceRecordId, isEditMode: false } };
      (useRoute as jest.Mock).mockReturnValue(mockRoute);

      renderWithIntegration(
        <CompleteJobScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Resume Draft?',
          expect.any(String),
          expect.any(Array)
        );
      });
    });
  });
});
