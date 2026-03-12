import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';
import ErrorBoundary from '../../components/ErrorBoundary';

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

function ThrowingChild({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test render crash');
  }
  return <Text>child rendered</Text>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <Text>ok</Text>
      </ErrorBoundary>
    );

    expect(screen.getByText('ok')).toBeTruthy();
  });

  it('renders fallback when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong.')).toBeTruthy();
    expect(screen.queryByText('child rendered')).toBeNull();
  });

  it('retry resets the boundary', () => {
    let shouldThrow = true;
    function Controlled() {
      if (shouldThrow) throw new Error('crash');
      return <Text>recovered</Text>;
    }

    render(
      <ErrorBoundary>
        <Controlled />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong.')).toBeTruthy();

    shouldThrow = false;
    fireEvent.press(screen.getByText('Retry'));

    expect(screen.getByText('recovered')).toBeTruthy();
  });

  it('max retries shows persistent failure message', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('Retry')).toBeTruthy();

    fireEvent.press(screen.getByText('Retry'));
    fireEvent.press(screen.getByText('Retry'));
    fireEvent.press(screen.getByText('Retry'));

    expect(screen.getByText('This screen keeps failing. Please restart the app.')).toBeTruthy();
    expect(screen.queryByText('Retry')).toBeNull();
  });

  it('onError callback is called with error and component stack', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowingChild />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('resetKey change resets the boundary', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="key-1">
        <ThrowingChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong.')).toBeTruthy();

    let throwAgain = false;
    function MaybeThrow() {
      if (throwAgain) throw new Error('again');
      return <Text>reset worked</Text>;
    }

    rerender(
      <ErrorBoundary resetKey="key-2">
        <MaybeThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText('reset worked')).toBeTruthy();
    expect(screen.queryByText('Something went wrong.')).toBeNull();
  });
});
