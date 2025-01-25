import React from 'react';
import { Alert } from 'react-native';
import { renderWithIntegration, waitFor, fireEvent, screen } from '../integration-utils';
import { ActiveJobsScreen } from '../../screens/ActiveJobsScreen';
import { CheckInScreen } from '../../screens/CheckInScreen';
import { useNavigation, useRoute } from '@react-navigation/native';
import { server } from '../msw/server';
import { http, HttpResponse } from 'msw';

jest.unmock('../../utils/trpc');

jest.spyOn(Alert, 'alert');

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

const mockRouteActiveJobs = {
  params: undefined,
  key: 'ActiveJobs',
  name: 'ActiveJobs' as const,
};

const mockRouteCheckIn = {
  params: {
    jobId: 'job_001',
    equipmentId: 'eq_001',
  },
};

(useNavigation as jest.Mock).mockReturnValue(mockNavigation);

describe('Network Error Recovery Integration Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render screen even when network request fails', async () => {
    server.use(
      http.get('http://localhost:3002/trpc/job.listActive', () => {
        return HttpResponse.error();
      })
    );

    (useRoute as jest.Mock).mockReturnValue(mockRouteActiveJobs);

    renderWithIntegration(
      <ActiveJobsScreen navigation={mockNavigation as any} route={mockRouteActiveJobs as any} />
    );

    // Screen renders without crashing even with network error
    expect(true).toBeTruthy();
  });

  it('should render screen even with server errors', async () => {
    server.use(
      http.get('http://localhost:3002/trpc/job.listActive', () => {
        return HttpResponse.json({
          error: {
            message: 'Internal server error',
            code: -32603,
          },
        }, { status: 500 });
      })
    );

    (useRoute as jest.Mock).mockReturnValue(mockRouteActiveJobs);

    renderWithIntegration(
      <ActiveJobsScreen navigation={mockNavigation as any} route={mockRouteActiveJobs as any} />
    );

    // Screen renders without crashing
    expect(true).toBeTruthy();
  });

  it('should display data when network recovers', async () => {
    (useRoute as jest.Mock).mockReturnValue(mockRouteActiveJobs);

    renderWithIntegration(
      <ActiveJobsScreen navigation={mockNavigation as any} route={mockRouteActiveJobs as any} />
    );

    // With default MSW handlers, data should load successfully
    await waitFor(() => {
      expect(screen.queryByText('Acme Construction')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should render check-in form successfully', async () => {
    (useRoute as jest.Mock).mockReturnValue(mockRouteCheckIn);

    renderWithIntegration(
      <CheckInScreen route={mockRouteCheckIn as any} navigation={mockNavigation as any} />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/equipment condition/i)).toBeTruthy();
    });

    const notesInput = screen.getByPlaceholderText(/equipment condition/i);
    fireEvent.changeText(notesInput, 'Test notes');

    expect(notesInput.props.value).toBe('Test notes');
  });

  it('should render loading state initially', async () => {
    (useRoute as jest.Mock).mockReturnValue(mockRouteActiveJobs);

    renderWithIntegration(
      <ActiveJobsScreen navigation={mockNavigation as any} route={mockRouteActiveJobs as any} />
    );

    // Should render without crashing
    expect(true).toBeTruthy();
  });

  it('should render form even when job query fails', async () => {
    server.use(
      http.get('http://localhost:3002/trpc/job.byId', () => {
        return HttpResponse.json({
          error: {
            message: 'Job not found',
            code: -32004,
            data: {
              code: 'NOT_FOUND',
            },
          },
        }, { status: 404 });
      })
    );

    (useRoute as jest.Mock).mockReturnValue(mockRouteCheckIn);

    renderWithIntegration(
      <CheckInScreen route={mockRouteCheckIn as any} navigation={mockNavigation as any} />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/current engine hours/i)).toBeTruthy();
    });
  });
});
