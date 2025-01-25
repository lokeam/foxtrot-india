import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { httpLink } from '@trpc/client';
import { trpc } from '../utils/trpc';

export function renderWithIntegration(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const trpcClient = trpc.createClient({
    links: [
      httpLink({
        url: 'http://localhost:3002/trpc',
        fetch: fetch,
      }),
    ],
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>{children}</NavigationContainer>
        </QueryClientProvider>
      </trpc.Provider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    queryClient,
    trpcClient,
  };
}

export * from '@testing-library/react-native';
