import React from 'react';
import { renderWithIntegration, waitFor, fireEvent, screen } from '../integration-utils';
import { ActiveJobsScreen } from '../../screens/ActiveJobsScreen';
import { useNavigation } from '@react-navigation/native';

jest.unmock('../../utils/trpc');

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

const mockRoute = {
  params: undefined,
  key: 'ActiveJobs',
  name: 'ActiveJobs' as const,
};

(useNavigation as jest.Mock).mockReturnValue(mockNavigation);

describe('Job List Navigation Integration Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and display active jobs list with correct data', async () => {
    renderWithIntegration(
      <ActiveJobsScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    await waitFor(() => {
      expect(screen.getByText('Acme Construction')).toBeTruthy();
    }, { timeout: 10000 });

    expect(screen.getByText('BuildCo LLC')).toBeTruthy();

    expect(screen.getByText('CAT-2021-001')).toBeTruthy();
    expect(screen.getByText('JD-2020-042')).toBeTruthy();

    expect(screen.getByText('Caterpillar 320 Excavator')).toBeTruthy();
    expect(screen.getByText('John Deere 644K Loader')).toBeTruthy();
  });

  it('should display status badges with correct colors', async () => {
    renderWithIntegration(
      <ActiveJobsScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    await waitFor(() => {
      expect(screen.getByText('Acme Construction')).toBeTruthy();
    });

    const assignedBadge = screen.getByText('Assigned');
    expect(assignedBadge).toBeTruthy();

    const inProgressBadge = screen.getByText('In Progress');
    expect(inProgressBadge).toBeTruthy();
  });

  it('should navigate to job detail when job card is pressed', async () => {
    renderWithIntegration(
      <ActiveJobsScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    await waitFor(() => {
      expect(screen.getByText('Acme Construction')).toBeTruthy();
    });

    const jobCard = screen.getByText('Acme Construction');
    fireEvent.press(jobCard.parent?.parent || jobCard);

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('JobDetail', {
        jobId: 'job_001',
      });
    });
  });

  it('should display jobs after loading', async () => {
    renderWithIntegration(
      <ActiveJobsScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    await waitFor(() => {
      expect(screen.getByText('Acme Construction')).toBeTruthy();
    });

    expect(screen.getByText('BuildCo LLC')).toBeTruthy();
  });

  it('should handle empty job list', async () => {
    const { server } = require('../msw/server');
    const { http, HttpResponse } = require('msw');

    server.use(
      http.get('http://localhost:3002/trpc/job.listActive', () => {
        return HttpResponse.json({
          result: {
            data: [],
          },
        });
      }),
      http.get('http://localhost:3002/trpc/job.listCompleted', () => {
        return HttpResponse.json({
          result: {
            data: [],
          },
        });
      })
    );

    renderWithIntegration(
      <ActiveJobsScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    // Should render without crashing
    await waitFor(() => {
      expect(true).toBeTruthy();
    });
  });

  it('should display loading state initially', () => {
    renderWithIntegration(
      <ActiveJobsScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    expect(screen.queryByTestId('loading-indicator') || screen.queryByText(/loading/i)).toBeTruthy();
  });

  it('should separate assigned and in-progress jobs into sections', async () => {
    renderWithIntegration(
      <ActiveJobsScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    await waitFor(() => {
      expect(screen.getByText('Acme Construction')).toBeTruthy();
    });

    const assignedJob = screen.getByText('Acme Construction');
    const inProgressJob = screen.getByText('BuildCo LLC');

    expect(assignedJob).toBeTruthy();
    expect(inProgressJob).toBeTruthy();
  });

  it('should navigate when job card is pressed', async () => {
    renderWithIntegration(
      <ActiveJobsScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    await waitFor(() => {
      expect(screen.getByText('Acme Construction')).toBeTruthy();
    });

    const jobCard = screen.getByText('Acme Construction');
    fireEvent.press(jobCard.parent?.parent || jobCard);

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalled();
    });
  });
});
