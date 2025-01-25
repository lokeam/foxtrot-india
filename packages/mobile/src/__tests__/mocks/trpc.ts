import { QueryClient } from '@tanstack/react-query';

// Mock tRPC utilities for testing
export const createMockTRPCContext = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return { queryClient };
};

// Helper to create mock mutation
export const createMockMutation = (options: {
  mutate?: jest.Mock;
  mutateAsync?: jest.Mock;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  isSuccess?: boolean;
  data?: unknown;
}) => ({
  mutate: options.mutate || jest.fn(),
  mutateAsync: options.mutateAsync || jest.fn(),
  isLoading: options.isLoading || false,
  isError: options.isError || false,
  error: options.error || null,
  isSuccess: options.isSuccess || false,
  data: options.data || null,
  reset: jest.fn(),
  status: options.isLoading ? 'loading' : options.isSuccess ? 'success' : 'idle',
});

// Helper to create mock query
export const createMockQuery = (options: {
  data?: unknown;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  refetch?: jest.Mock;
}) => ({
  data: options.data || null,
  isLoading: options.isLoading || false,
  isError: options.isError || false,
  error: options.error || null,
  refetch: options.refetch || jest.fn(),
  isFetching: false,
  isSuccess: !options.isLoading && !options.isError,
  status: options.isLoading ? 'loading' : options.isError ? 'error' : 'success',
});
