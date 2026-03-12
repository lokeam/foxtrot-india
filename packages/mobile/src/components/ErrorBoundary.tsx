import React, { Component, ReactNode } from 'react';
import { ErrorFallback } from './ErrorFallback';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: { componentStack: string }) => void;
  onRetry?: () => void;
  onGoHome?: () => void;
  resetKey?: string | number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  retryCount: number;
}

const MAX_RETRIES = 3;

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    if (this.props.onError) {
      this.props.onError(error, { componentStack: info.componentStack || '' });
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.props.resetKey !== prevProps.resetKey && this.state.hasError) {
      this.setState({ hasError: false, retryCount: 0 });
    }
  }

  handleRetry = (): void => {
    this.setState((prev) => ({
      hasError: false,
      retryCount: prev.retryCount + 1,
    }));
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const maxRetriesReached = this.state.retryCount >= MAX_RETRIES;

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <ErrorFallback
        onRetry={maxRetriesReached ? undefined : this.handleRetry}
        onGoHome={this.props.onGoHome}
        maxRetriesReached={maxRetriesReached}
      />
    );
  }
}
