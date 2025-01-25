import React from 'react';
import { Alert } from 'react-native';
import { renderWithProviders, screen, fireEvent, waitFor } from '../../__tests__/test-utils';
import { JobDetailScreen } from '../JobDetailScreen';
import { trpc } from '../../utils/trpc';
import { createMockMutation, createMockQuery } from '../../__tests__/mocks/trpc';

jest.mock('../../utils/trpc');
jest.spyOn(Alert, 'alert');

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

const mockRoute = {
  params: { jobId: 'job_123' },
  key: 'test-key',
  name: 'JobDetail' as const,
};

const mockAssignedJob = {
  id: 'job_123',
  status: 'ASSIGNED',
  customerName: 'Acme Construction',
  equipment: {
    id: 'equip_123',
    serialNumber: 'CAT336-12345',
    make: 'Caterpillar',
    model: '336 Excavator',
    engineHours: 1200,
  },
  serviceRecord: null,
};

const mockInProgressJob = {
  ...mockAssignedJob,
  status: 'IN_PROGRESS',
  serviceRecord: {
    id: 'sr_123',
    beforePhotos: ['http://localhost:8000/before1.jpg'],
    beforeNotes: 'Initial inspection',
    beforeEngineHours: 1250,
  },
};

const mockCompletedJob = {
  ...mockAssignedJob,
  status: 'COMPLETED',
  serviceRecord: {
    id: 'sr_123',
    beforePhotos: ['http://localhost:8000/before1.jpg'],
    beforeNotes: 'Initial inspection',
    beforeEngineHours: 1250,
    afterPhotos: ['http://localhost:8000/after1.jpg'],
    diagnosis: 'Hydraulic leak',
    workPerformed: 'Replaced seal',
    afterEngineHours: 1260,
  },
};

describe('JobDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Conditional Rendering', () => {
    it('shows "Start Check-In" button for ASSIGNED jobs', async () => {
      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockAssignedJob })
      );
      (trpc.serviceRecord.deleteBeforePhoto.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.serviceRecord.deleteAfterPhoto.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.useUtils as jest.Mock).mockReturnValue({});

      renderWithProviders(
        <JobDetailScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(screen.getByText(/start check-in/i)).toBeTruthy();
      });

      expect(screen.queryByText(/complete job/i)).toBeNull();
    });

    it('shows "Complete Job" button for IN_PROGRESS jobs', async () => {
      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockInProgressJob })
      );
      (trpc.serviceRecord.deleteBeforePhoto.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.serviceRecord.deleteAfterPhoto.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.useUtils as jest.Mock).mockReturnValue({});

      renderWithProviders(
        <JobDetailScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(screen.getByText(/complete job/i)).toBeTruthy();
      });

      expect(screen.queryByText(/start check-in/i)).toBeNull();
    });

    it('shows completion details for COMPLETED jobs', async () => {
      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockCompletedJob })
      );
      (trpc.serviceRecord.deleteBeforePhoto.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.serviceRecord.deleteAfterPhoto.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.useUtils as jest.Mock).mockReturnValue({});

      renderWithProviders(
        <JobDetailScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(screen.getByText(/completed/i)).toBeTruthy();
        expect(screen.getByText(/edit completion/i)).toBeTruthy();
      });
    });
  });

  describe('Photo Deletion', () => {
    it('displays before photos for IN_PROGRESS jobs', async () => {
      const mockMutate = jest.fn();
      const mockInvalidate = jest.fn();

      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockInProgressJob })
      );
      (trpc.serviceRecord.deleteBeforePhoto.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({ mutate: mockMutate })
      );
      (trpc.serviceRecord.deleteAfterPhoto.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.useUtils as jest.Mock).mockReturnValue({
        job: { byId: { invalidate: mockInvalidate } },
      });

      renderWithProviders(
        <JobDetailScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(screen.getByText(/before photos/i)).toBeTruthy();
      });
    });

    it('shows edit buttons for COMPLETED jobs', async () => {
      const mockMutate = jest.fn();
      const mockInvalidate = jest.fn();

      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockCompletedJob })
      );
      (trpc.serviceRecord.deleteBeforePhoto.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.serviceRecord.deleteAfterPhoto.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({ mutate: mockMutate })
      );
      (trpc.useUtils as jest.Mock).mockReturnValue({
        job: { byId: { invalidate: mockInvalidate } },
      });

      renderWithProviders(
        <JobDetailScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(screen.getByText(/edit check-in/i)).toBeTruthy();
        expect(screen.getByText(/edit completion/i)).toBeTruthy();
      });
    });

    it('shows edit buttons for IN_PROGRESS jobs', async () => {
      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockInProgressJob })
      );
      (trpc.serviceRecord.deleteBeforePhoto.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.serviceRecord.deleteAfterPhoto.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.useUtils as jest.Mock).mockReturnValue({
        job: { byId: { invalidate: jest.fn() } },
      });

      renderWithProviders(
        <JobDetailScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(screen.getByText(/edit check-in/i)).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to CheckIn screen for ASSIGNED jobs', async () => {
      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockAssignedJob })
      );
      (trpc.serviceRecord.deleteBeforePhoto.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.serviceRecord.deleteAfterPhoto.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.useUtils as jest.Mock).mockReturnValue({});

      renderWithProviders(
        <JobDetailScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(screen.getByText(/start check-in/i)).toBeTruthy();
      });

      const checkInButton = screen.getByText(/start check-in/i);
      fireEvent.press(checkInButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('CheckIn', {
        jobId: 'job_123',
        equipmentId: mockAssignedJob.equipment.id,
      });
    });

    it('navigates to CompleteJob screen for IN_PROGRESS jobs', async () => {
      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockInProgressJob })
      );
      (trpc.serviceRecord.deleteBeforePhoto.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.serviceRecord.deleteAfterPhoto.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.useUtils as jest.Mock).mockReturnValue({});

      renderWithProviders(
        <JobDetailScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(screen.getByText(/complete job/i)).toBeTruthy();
      });

      const completeButton = screen.getByText(/complete job/i);
      fireEvent.press(completeButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('CompleteJob', {
        jobId: 'job_123',
        serviceRecordId: 'sr_123',
      });
    });
  });
});
