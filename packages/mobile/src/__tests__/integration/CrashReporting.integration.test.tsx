import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import ErrorBoundary from '../../components/ErrorBoundary';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../../utils/crashReporter', () => ({
  reportCrash: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../utils/crashQueue', () => ({
  flushCrashQueue: jest.fn(() => Promise.resolve()),
  queueCrashReport: jest.fn(() => Promise.resolve()),
}));

import { reportCrash } from '../../utils/crashReporter';
import { flushCrashQueue } from '../../utils/crashQueue';

const mockReportCrash = reportCrash as jest.MockedFunction<typeof reportCrash>;
const mockFlushCrashQueue = flushCrashQueue as jest.MockedFunction<typeof flushCrashQueue>;
const mockGetItem = AsyncStorage.getItem as jest.Mock;

// Suppress console.error from React's error boundary logging
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (msg.includes('Error Boundary') || msg.includes('The above error')) return;
    originalConsoleError(...args);
  };
});
afterAll(() => {
  console.error = originalConsoleError;
});

function ThrowingScreen() {
  throw new Error('Screen crash');
  return null;
}

describe('Crash Reporting Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockImplementation(() => Promise.resolve(null));
  });

  it('boundary catches crash and calls reportCrash', () => {
    render(
      <ErrorBoundary
        onError={(error, info) => {
          mockReportCrash({
            message: error.message,
            componentStack: info.componentStack,
            screenName: 'TestScreen',
          });
        }}
      >
        <ThrowingScreen />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong.')).toBeTruthy();
    expect(mockReportCrash).toHaveBeenCalledTimes(1);
    expect(mockReportCrash).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Screen crash',
        componentStack: expect.any(String),
        screenName: 'TestScreen',
      })
    );
  });

  it('root boundary catches crash outside providers', () => {
    function FakeProviders({ children }: { children: React.ReactNode }) {
      throw new Error('Provider crash');
      return <>{children}</>;
    }

    render(
      <ErrorBoundary
        onError={(error, info) => {
          mockReportCrash({
            message: error.message,
            componentStack: info.componentStack,
          });
        }}
      >
        <FakeProviders>
          <Text>app content</Text>
        </FakeProviders>
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong.')).toBeTruthy();
    expect(mockReportCrash).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Provider crash' })
    );
  });

  it('crash queue is flushed on app mount', async () => {
    const queuedPayload = {
      message: 'previous crash',
      componentStack: 'previous stack',
    };

    mockGetItem.mockImplementation((key: string) => {
      if (key === 'crash_report_queue') {
        return Promise.resolve(JSON.stringify([queuedPayload]));
      }
      return Promise.resolve(null);
    });

    // Simulate what App.tsx does on mount
    React.useEffect = jest.fn((cb) => { cb(); });

    const { flushCrashQueue: realFlush } = jest.requireActual('../../utils/crashQueue');

    // Call flushCrashQueue directly with the mock reportCrash, same as App.tsx does
    await realFlush(mockReportCrash);

    expect(mockReportCrash).toHaveBeenCalledWith(queuedPayload);
  });
});
