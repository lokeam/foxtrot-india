import React from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { renderWithProviders, screen, fireEvent, waitFor } from '../../__tests__/test-utils';
import { CompleteJobScreen } from '../CompleteJobScreen';
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
  params: {
    jobId: 'job_123',
    serviceRecordId: 'sr_123',
    beforeEngineHours: 1250,
  },
  key: 'test-key',
  name: 'CompleteJob' as const,
};

const mockJob = {
  id: 'job_123',
  status: 'IN_PROGRESS',
  serviceRecord: {
    id: 'sr_123',
    beforePhotos: ['http://localhost:8000/before1.jpg'],
    beforeNotes: 'Initial inspection notes',
    beforeEngineHours: 1250,
  },
};

describe('CompleteJobScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Draft Persistence', () => {
    it('loads draft from AsyncStorage on mount', async () => {
      const draft = {
        diagnosis: 'Draft diagnosis',
        workPerformed: 'Draft work',
        partsUsed: 'Draft parts',
        afterEngineHours: '1260',
        photos: [{ uri: 'photo1.jpg' }],
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(draft));
      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockJob })
      );
      (trpc.serviceRecord.complete.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.serviceRecord.updateCompletion.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.useUtils as jest.Mock).mockReturnValue({
        job: {
          byId: { invalidate: jest.fn() },
          listActive: { invalidate: jest.fn() },
          listCompleted: { invalidate: jest.fn() }
        },
        serviceRecord: { recent: { invalidate: jest.fn() } },
      });

      renderWithProviders(
        <CompleteJobScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(AsyncStorage.getItem).toHaveBeenCalledWith('draft_complete_sr_123');
      });
    });

    it('saves draft to AsyncStorage on form change', async () => {
      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockJob })
      );
      (trpc.serviceRecord.complete.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.serviceRecord.updateCompletion.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.useUtils as jest.Mock).mockReturnValue({
        job: {
          byId: { invalidate: jest.fn() },
          listActive: { invalidate: jest.fn() },
          listCompleted: { invalidate: jest.fn() }
        },
        serviceRecord: { recent: { invalidate: jest.fn() } },
      });

      renderWithProviders(
        <CompleteJobScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      const diagnosisInput = screen.getByPlaceholderText(/what was the problem/i);
      fireEvent.changeText(diagnosisInput, 'Hydraulic leak');

      await waitFor(
        () => {
          expect(AsyncStorage.setItem).toHaveBeenCalledWith(
            'draft_complete_sr_123',
            expect.stringContaining('Hydraulic leak')
          );
        },
        { timeout: 3000 }
      );
    });

    it('clears draft after successful submission', async () => {
      const mockMutateAsync = jest.fn().mockResolvedValue({
        id: 'sr_123',
        jobId: 'job_123',
      });

      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockJob })
      );
      (trpc.serviceRecord.complete.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );
      (trpc.serviceRecord.updateCompletion.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.useUtils as jest.Mock).mockReturnValue({
        job: {
          byId: { invalidate: jest.fn() },
          listActive: { invalidate: jest.fn() },
          listCompleted: { invalidate: jest.fn() }
        },
        serviceRecord: { recent: { invalidate: jest.fn() } },
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ url: 'http://localhost:8000/photo.jpg' }),
      });

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'after-photo.jpg', base64: 'base64data' }],
      });

      renderWithProviders(
        <CompleteJobScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      // Add photo first
      const choosePhotoButton = screen.getByText(/choose photo/i);
      fireEvent.press(choosePhotoButton);

      await waitFor(() => {
        expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });

      const diagnosisInput = screen.getByPlaceholderText(/what was the problem/i);
      fireEvent.changeText(diagnosisInput, 'Hydraulic leak');

      const workInput = screen.getByPlaceholderText(/describe the repairs/i);
      fireEvent.changeText(workInput, 'Replaced seal');

      const hoursInput = screen.getByPlaceholderText(/engine hours after completion/i);
      fireEvent.changeText(hoursInput, '1260');

      const submitButton = screen.getAllByText(/complete job/i)[1]; // Get button, not title
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith('draft_complete_sr_123');
      });
    });
  });

  describe('Form Validation', () => {
    it('requires diagnosis with minimum 1 character', async () => {
      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockJob })
      );
      (trpc.serviceRecord.complete.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.serviceRecord.updateCompletion.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.useUtils as jest.Mock).mockReturnValue({
        job: {
          byId: { invalidate: jest.fn() },
          listActive: { invalidate: jest.fn() },
          listCompleted: { invalidate: jest.fn() }
        },
        serviceRecord: { recent: { invalidate: jest.fn() } },
      });

      renderWithProviders(
        <CompleteJobScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      const workInput = screen.getByPlaceholderText(/describe the repairs/i);
      fireEvent.changeText(workInput, 'Replaced seal');

      const hoursInput = screen.getByPlaceholderText(/engine hours after completion/i);
      fireEvent.changeText(hoursInput, '1260');

      const submitButton = screen.getAllByText(/complete job/i)[1]; // Get button, not title
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Validation Error',
          'Diagnosis is required.'
        );
      });
    });

    it('requires work performed with minimum 1 character', async () => {
      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockJob })
      );
      (trpc.serviceRecord.complete.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.serviceRecord.updateCompletion.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.useUtils as jest.Mock).mockReturnValue({
        job: {
          byId: { invalidate: jest.fn() },
          listActive: { invalidate: jest.fn() },
          listCompleted: { invalidate: jest.fn() }
        },
        serviceRecord: { recent: { invalidate: jest.fn() } },
      });

      renderWithProviders(
        <CompleteJobScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      const diagnosisInput = screen.getByPlaceholderText(/what was the problem/i);
      fireEvent.changeText(diagnosisInput, 'Hydraulic leak');

      const hoursInput = screen.getByPlaceholderText(/engine hours after completion/i);
      fireEvent.changeText(hoursInput, '1260');

      const submitButton = screen.getAllByText(/complete job/i)[1]; // Get button, not title
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Validation Error',
          'Work performed is required.'
        );
      });
    });

    it('validates afterEngineHours >= beforeEngineHours', async () => {
      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockJob })
      );
      (trpc.serviceRecord.complete.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.serviceRecord.updateCompletion.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.useUtils as jest.Mock).mockReturnValue({
        job: {
          byId: { invalidate: jest.fn() },
          listActive: { invalidate: jest.fn() },
          listCompleted: { invalidate: jest.fn() }
        },
        serviceRecord: { recent: { invalidate: jest.fn() } },
      });

      renderWithProviders(
        <CompleteJobScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      const diagnosisInput = screen.getByPlaceholderText(/what was the problem/i);
      fireEvent.changeText(diagnosisInput, 'Hydraulic leak');

      const workInput = screen.getByPlaceholderText(/describe the repairs/i);
      fireEvent.changeText(workInput, 'Replaced seal');

      const hoursInput = screen.getByPlaceholderText(/engine hours after completion/i);
      fireEvent.changeText(hoursInput, '1200');

      const submitButton = screen.getAllByText(/complete job/i)[1]; // Get button, not title
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Validation Error',
          expect.stringContaining('cannot be less than before')
        );
      });
    });

    it('allows empty partsUsed', async () => {
      const mockMutateAsync = jest.fn().mockResolvedValue({
        id: 'sr_123',
        jobId: 'job_123',
        isJobComplete: true,
      });

      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockJob })
      );
      (trpc.serviceRecord.complete.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );
      (trpc.serviceRecord.updateCompletion.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.useUtils as jest.Mock).mockReturnValue({
        job: {
          byId: { invalidate: jest.fn() },
          listActive: { invalidate: jest.fn() },
          listCompleted: { invalidate: jest.fn() }
        },
        serviceRecord: { recent: { invalidate: jest.fn() } },
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ url: 'http://localhost:8000/photo.jpg' }),
      });

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'after-photo.jpg', base64: 'base64data' }],
      });

      renderWithProviders(
        <CompleteJobScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      // Add photo first to pass validation
      const choosePhotoButton = screen.getByText(/choose photo/i);
      fireEvent.press(choosePhotoButton);

      await waitFor(() => {
        expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });

      const diagnosisInput = screen.getByPlaceholderText(/what was the problem/i);
      fireEvent.changeText(diagnosisInput, 'Hydraulic leak');

      const workInput = screen.getByPlaceholderText(/describe the repairs/i);
      fireEvent.changeText(workInput, 'Replaced seal');

      const hoursInput = screen.getByPlaceholderText(/engine hours after completion/i);
      fireEvent.changeText(hoursInput, '1260');

      const submitButton = screen.getAllByText(/complete job/i)[1]; // Get button, not title
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            serviceRecordId: 'sr_123',
            diagnosis: 'Hydraulic leak',
            workPerformed: 'Replaced seal',
            afterEngineHours: 1260,
          })
        );
      });
    });
  });

  describe('Photo Upload', () => {
    it('uploads after photos to backend', async () => {
      const mockMutateAsync = jest.fn().mockResolvedValue({
        id: 'sr_123',
        jobId: 'job_123',
        isJobComplete: true,
      });

      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockJob })
      );
      (trpc.serviceRecord.complete.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );
      (trpc.useUtils as jest.Mock).mockReturnValue({
        job: { byId: { invalidate: jest.fn() } },
        serviceRecord: { recent: { invalidate: jest.fn() } },
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ url: 'http://localhost:8000/after-photo.jpg' }),
      });

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'after-photo.jpg', base64: 'base64data' }],
      });

      renderWithProviders(
        <CompleteJobScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      const choosePhotoButton = screen.getByText(/choose photo/i);
      fireEvent.press(choosePhotoButton);

      await waitFor(() => {
        expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });

      const diagnosisInput = screen.getByPlaceholderText(/what was the problem/i);
      fireEvent.changeText(diagnosisInput, 'Hydraulic leak');

      const workInput = screen.getByPlaceholderText(/describe the repairs/i);
      fireEvent.changeText(workInput, 'Replaced seal');

      const hoursInput = screen.getByPlaceholderText(/engine hours after completion/i);
      fireEvent.changeText(hoursInput, '1260');

      const submitButton = screen.getAllByText(/complete job/i)[1]; // Get button, not title
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/upload'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('base64data'),
          })
        );
      });
    });

    it('handles photo upload failures', async () => {
      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockJob })
      );
      (trpc.serviceRecord.complete.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.serviceRecord.updateCompletion.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.useUtils as jest.Mock).mockReturnValue({
        job: {
          byId: { invalidate: jest.fn() },
          listActive: { invalidate: jest.fn() },
          listCompleted: { invalidate: jest.fn() }
        },
        serviceRecord: { recent: { invalidate: jest.fn() } },
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Upload failed' }),
      });

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'after-photo.jpg', base64: 'base64data' }],
      });

      renderWithProviders(
        <CompleteJobScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      const choosePhotoButton = screen.getByText(/choose photo/i);
      fireEvent.press(choosePhotoButton);

      await waitFor(() => {
        expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });

      const diagnosisInput = screen.getByPlaceholderText(/what was the problem/i);
      fireEvent.changeText(diagnosisInput, 'Hydraulic leak');

      const workInput = screen.getByPlaceholderText(/describe the repairs/i);
      fireEvent.changeText(workInput, 'Replaced seal');

      const hoursInput = screen.getByPlaceholderText(/engine hours after completion/i);
      fireEvent.changeText(hoursInput, '1260');

      const submitButton = screen.getAllByText(/complete job/i)[1]; // Get button, not title
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Completion Failed',
          'Failed to upload photo'
        );
      });
    });
  });

  describe('Submission Flow', () => {
    it('calls serviceRecord.complete mutation with correct data', async () => {
      const mockMutateAsync = jest.fn().mockResolvedValue({
        id: 'sr_123',
        jobId: 'job_123',
        isJobComplete: true,
      });

      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockJob })
      );
      (trpc.serviceRecord.complete.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );
      (trpc.useUtils as jest.Mock).mockReturnValue({
        job: { byId: { invalidate: jest.fn() } },
        serviceRecord: { recent: { invalidate: jest.fn() } },
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ url: 'http://localhost:8000/photo.jpg' }),
      });

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'after-photo.jpg', base64: 'base64data' }],
      });

      renderWithProviders(
        <CompleteJobScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      const choosePhotoButton = screen.getByText(/choose photo/i);
      fireEvent.press(choosePhotoButton);

      await waitFor(() => {
        expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });

      const diagnosisInput = screen.getByPlaceholderText(/what was the problem/i);
      fireEvent.changeText(diagnosisInput, 'Hydraulic leak');

      const workInput = screen.getByPlaceholderText(/describe the repairs/i);
      fireEvent.changeText(workInput, 'Replaced seal');

      const partsInput = screen.getByPlaceholderText(/list parts replaced or used/i);
      fireEvent.changeText(partsInput, 'Hydraulic seal kit');

      const hoursInput = screen.getByPlaceholderText(/engine hours after completion/i);
      fireEvent.changeText(hoursInput, '1260');

      const submitButton = screen.getAllByText(/complete job/i)[1]; // Get button, not title
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          serviceRecordId: 'sr_123',
          afterPhotos: ['http://localhost:8000/photo.jpg'],
          diagnosis: 'Hydraulic leak',
          workPerformed: 'Replaced seal',
          partsUsed: 'Hydraulic seal kit',
          afterEngineHours: 1260,
          completedAt: expect.any(Date),
        });
      });
    });

    it('navigates to Completed Jobs on success', async () => {
      const mockMutateAsync = jest.fn().mockResolvedValue({
        id: 'sr_123',
        jobId: 'job_123',
        isJobComplete: true,
      });

      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockJob })
      );
      (trpc.serviceRecord.complete.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );
      (trpc.serviceRecord.updateCompletion.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.useUtils as jest.Mock).mockReturnValue({
        job: {
          byId: { invalidate: jest.fn() },
          listActive: { invalidate: jest.fn() },
          listCompleted: { invalidate: jest.fn() }
        },
        serviceRecord: { recent: { invalidate: jest.fn() } },
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ url: 'http://localhost:8000/photo.jpg' }),
      });

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'after-photo.jpg', base64: 'base64data' }],
      });

      renderWithProviders(
        <CompleteJobScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      const choosePhotoButton = screen.getByText(/choose photo/i);
      fireEvent.press(choosePhotoButton);

      await waitFor(() => {
        expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });

      const diagnosisInput = screen.getByPlaceholderText(/what was the problem/i);
      fireEvent.changeText(diagnosisInput, 'Hydraulic leak');

      const workInput = screen.getByPlaceholderText(/describe the repairs/i);
      fireEvent.changeText(workInput, 'Replaced seal');

      const hoursInput = screen.getByPlaceholderText(/engine hours after completion/i);
      fireEvent.changeText(hoursInput, '1260');

      const submitButton = screen.getAllByText(/complete job/i)[1]; // Get button, not title
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      // Wait for success alert
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Job completed successfully!',
          expect.any(Array)
        );
      });

      // Simulate pressing OK button
      const alertCall = (Alert.alert as jest.Mock).mock.calls.find(
        call => call[0] === 'Success'
      );
      if (alertCall && alertCall[2] && alertCall[2][0].onPress) {
        alertCall[2][0].onPress();
      }

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith('ActiveJobs');
      });
    });
  });
});
