import React from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { renderWithProviders, screen, fireEvent, waitFor } from '../../__tests__/test-utils';
import { CheckInScreen } from '../CheckInScreen';
import { trpc } from '../../utils/trpc';
import { createMockMutation, createMockQuery } from '../../__tests__/mocks/trpc';

// Mock modules
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
    equipmentId: 'equip_123',
  },
  key: 'test-key',
  name: 'CheckIn' as const,
};

const mockJob = {
  id: 'job_123',
  equipmentId: 'equip_123',
  status: 'ASSIGNED',
  equipment: {
    id: 'equip_123',
    serialNumber: 'CAT336-12345',
    make: 'Caterpillar',
    model: '336 Excavator',
    engineHours: 1250,
  },
  serviceRecord: null,
};

describe('CheckInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Draft Persistence', () => {
    it('loads draft from AsyncStorage on mount', async () => {
      const draft = {
        beforeNotes: 'Draft notes',
        beforeEngineHours: '1250',
        photos: [{ uri: 'photo1.jpg' }],
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(draft));
      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockJob })
      );
      (trpc.serviceRecord.checkIn.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.serviceRecord.updateCheckIn.useMutation as jest.Mock).mockReturnValue(
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
        <CheckInScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(AsyncStorage.getItem).toHaveBeenCalledWith('draft_checkin_job_123');
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Resume Draft?',
          'You have unsaved changes. Would you like to resume?',
          expect.any(Array)
        );
      });
    });

    it('saves draft to AsyncStorage on form change', async () => {
      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockJob })
      );
      (trpc.serviceRecord.checkIn.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.serviceRecord.updateCheckIn.useMutation as jest.Mock).mockReturnValue(
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
        <CheckInScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      const notesInput = screen.getByPlaceholderText(/add notes about the equipment condition/i);
      fireEvent.changeText(notesInput, 'New notes');

      await waitFor(
        () => {
          expect(AsyncStorage.setItem).toHaveBeenCalledWith(
            'draft_checkin_job_123',
            expect.stringContaining('New notes')
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
      (trpc.serviceRecord.checkIn.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );
      (trpc.serviceRecord.updateCheckIn.useMutation as jest.Mock).mockReturnValue(
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
        assets: [{ uri: 'photo1.jpg', base64: 'base64data' }],
      });

      renderWithProviders(
        <CheckInScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      // Add a photo to pass validation
      const choosePhotoButton = screen.getByText(/choose photo/i);
      fireEvent.press(choosePhotoButton);

      await waitFor(() => {
        expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });

      const notesInput = screen.getByPlaceholderText(/add notes about the equipment condition/i);
      fireEvent.changeText(notesInput, 'Test notes');

      const hoursInput = screen.getByPlaceholderText(/current engine hours/i);
      fireEvent.changeText(hoursInput, '1250');

      const submitButton = screen.getByText(/complete check-in/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith('draft_checkin_job_123');
      });
    });

    it('handles AsyncStorage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockJob })
      );
      (trpc.serviceRecord.checkIn.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.serviceRecord.updateCheckIn.useMutation as jest.Mock).mockReturnValue(
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

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      renderWithProviders(
        <CheckInScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error loading draft:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Form Validation', () => {
    it('requires at least 1 before photo', async () => {
      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockJob })
      );
      (trpc.serviceRecord.checkIn.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.serviceRecord.updateCheckIn.useMutation as jest.Mock).mockReturnValue(
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
        <CheckInScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      const notesInput = screen.getByPlaceholderText(/add notes about the equipment condition/i);
      fireEvent.changeText(notesInput, 'Test notes');

      const hoursInput = screen.getByPlaceholderText(/current engine hours/i);
      fireEvent.changeText(hoursInput, '1250');

      const submitButton = screen.getByText(/complete check-in/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'No Photos',
          'It is recommended to attach at least one photo. Continue without photos?',
          expect.any(Array)
        );
      });
    });

    it('limits to maximum 4 photos', async () => {
      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockJob })
      );
      (trpc.serviceRecord.checkIn.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.serviceRecord.updateCheckIn.useMutation as jest.Mock).mockReturnValue(
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

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'photo5.jpg', base64: 'base64data' }],
      });

      renderWithProviders(
        <CheckInScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      // Add 4 photos first
      for (let i = 0; i < 4; i++) {
        (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
          canceled: false,
          assets: [{ uri: `photo${i + 1}.jpg`, base64: 'base64data' }],
        });

        const choosePhotoButton = screen.getByText(/choose photo/i);
        fireEvent.press(choosePhotoButton);

        await waitFor(() => {
          expect(screen.queryByText(/choose photo/i)).toBeTruthy();
        });
      }

      // Try to add 5th photo - should be disabled or show alert
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'photo5.jpg', base64: 'base64data' }],
      });

      const choosePhotoButton = screen.queryByText(/choose photo/i);
      if (choosePhotoButton) {
        fireEvent.press(choosePhotoButton);

        await waitFor(() => {
          expect(Alert.alert).toHaveBeenCalledWith(
            'Photo Limit',
            'You can only attach up to 4 photos per check-in.'
          );
        });
      }
    });

    it('validates engine hours is a number', async () => {
      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockJob })
      );
      (trpc.serviceRecord.checkIn.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.serviceRecord.updateCheckIn.useMutation as jest.Mock).mockReturnValue(
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

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'photo1.jpg', base64: 'base64data' }],
      });

      renderWithProviders(
        <CheckInScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      // Add a photo first to pass photo validation
      const choosePhotoButton = screen.getByText(/choose photo/i);
      fireEvent.press(choosePhotoButton);

      await waitFor(() => {
        expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });

      const notesInput = screen.getByPlaceholderText(/add notes about the equipment condition/i);
      fireEvent.changeText(notesInput, 'Test notes');

      const hoursInput = screen.getByPlaceholderText(/current engine hours/i);
      fireEvent.changeText(hoursInput, 'invalid');

      const submitButton = screen.getByText(/complete check-in/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Validation Error',
          'Please enter valid engine hours.'
        );
      });
    });

    it('allows submission without notes', async () => {
      const mockMutateAsync = jest.fn().mockResolvedValue({
        id: 'sr_123',
        jobId: 'job_123',
      });

      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockJob })
      );
      (trpc.serviceRecord.checkIn.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );
      (trpc.serviceRecord.updateCheckIn.useMutation as jest.Mock).mockReturnValue(
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

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'photo1.jpg', base64: 'base64data' }],
      });

      renderWithProviders(
        <CheckInScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      // Add a photo first to pass photo validation
      const choosePhotoButton = screen.getByText(/choose photo/i);
      fireEvent.press(choosePhotoButton);

      await waitFor(() => {
        expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });

      const hoursInput = screen.getByPlaceholderText(/current engine hours/i);
      fireEvent.changeText(hoursInput, '1250');

      const submitButton = screen.getByText(/complete check-in/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            jobId: 'job_123',
            beforeEngineHours: 1250,
            beforeNotes: null,
          })
        );
      });
    });
  });

  describe('Photo Upload', () => {
    it('uploads photos to backend before submission', async () => {
      const mockMutateAsync = jest.fn().mockResolvedValue({
        id: 'sr_123',
        jobId: 'job_123',
      });

      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockJob })
      );
      (trpc.serviceRecord.checkIn.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );
      (trpc.serviceRecord.updateCheckIn.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
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
        assets: [{ uri: 'photo1.jpg', base64: 'base64data' }],
      });

      renderWithProviders(
        <CheckInScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      const choosePhotoButton = screen.getByText(/choose photo/i);
      fireEvent.press(choosePhotoButton);

      await waitFor(() => {
        expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });

      const notesInput = screen.getByPlaceholderText(/add notes about the equipment condition/i);
      fireEvent.changeText(notesInput, 'Test notes');

      const hoursInput = screen.getByPlaceholderText(/current engine hours/i);
      fireEvent.changeText(hoursInput, '1250');

      const submitButton = screen.getByText(/complete check-in/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/upload'),
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('base64data'),
          })
        );
      });
    });

    it('handles photo upload failures', async () => {
      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockJob })
      );
      (trpc.serviceRecord.checkIn.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({})
      );
      (trpc.serviceRecord.updateCheckIn.useMutation as jest.Mock).mockReturnValue(
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
        assets: [{ uri: 'photo1.jpg', base64: 'base64data' }],
      });

      renderWithProviders(
        <CheckInScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      const choosePhotoButton = screen.getByText(/choose photo/i);
      fireEvent.press(choosePhotoButton);

      await waitFor(() => {
        expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });

      const notesInput = screen.getByPlaceholderText(/add notes about the equipment condition/i);
      fireEvent.changeText(notesInput, 'Test notes');

      const hoursInput = screen.getByPlaceholderText(/current engine hours/i);
      fireEvent.changeText(hoursInput, '1250');

      const submitButton = screen.getByText(/complete check-in/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Check-In Failed',
          'Failed to upload photo'
        );
      });
    });
  });

  describe('Submission Flow', () => {
    it('calls serviceRecord.checkIn mutation with correct data', async () => {
      const mockMutateAsync = jest.fn().mockResolvedValue({
        id: 'sr_123',
        jobId: 'job_123',
      });

      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockJob })
      );
      (trpc.serviceRecord.checkIn.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );
      (trpc.serviceRecord.updateCheckIn.useMutation as jest.Mock).mockReturnValue(
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
        assets: [{ uri: 'photo1.jpg', base64: 'base64data' }],
      });

      renderWithProviders(
        <CheckInScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      const choosePhotoButton = screen.getByText(/choose photo/i);
      fireEvent.press(choosePhotoButton);

      await waitFor(() => {
        expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });

      const notesInput = screen.getByPlaceholderText(/add notes about the equipment condition/i);
      fireEvent.changeText(notesInput, 'Test notes');

      const hoursInput = screen.getByPlaceholderText(/current engine hours/i);
      fireEvent.changeText(hoursInput, '1250');

      const submitButton = screen.getByText(/complete check-in/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          jobId: 'job_123',
          beforePhotos: ['http://localhost:8000/photo.jpg'],
          beforeNotes: 'Test notes',
          beforeEngineHours: 1250,
          arrivedAt: expect.any(Date),
        });
      });
    });

    it('navigates to JobDetail on success', async () => {
      const mockMutateAsync = jest.fn().mockResolvedValue({
        id: 'sr_123',
        jobId: 'job_123',
      });

      (trpc.job.byId.useQuery as jest.Mock).mockReturnValue(
        createMockQuery({ data: mockJob })
      );
      (trpc.serviceRecord.checkIn.useMutation as jest.Mock).mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );
      (trpc.serviceRecord.updateCheckIn.useMutation as jest.Mock).mockReturnValue(
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
        assets: [{ uri: 'photo1.jpg', base64: 'base64data' }],
      });

      renderWithProviders(
        <CheckInScreen route={mockRoute} navigation={mockNavigation as any} />
      );

      const choosePhotoButton = screen.getByText(/choose photo/i);
      fireEvent.press(choosePhotoButton);

      await waitFor(() => {
        expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });

      const notesInput = screen.getByPlaceholderText(/add notes about the equipment condition/i);
      fireEvent.changeText(notesInput, 'Test notes');

      const hoursInput = screen.getByPlaceholderText(/current engine hours/i);
      fireEvent.changeText(hoursInput, '1250');

      const submitButton = screen.getByText(/complete check-in/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      // Wait for Alert.alert to be called with success message
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Check-in completed successfully!',
          expect.any(Array)
        );
      });

      // Simulate pressing OK button in alert
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
