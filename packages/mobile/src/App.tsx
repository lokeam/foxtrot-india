import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import * as SplashScreen from 'expo-splash-screen';
import { trpc } from './utils/trpc';
import { RootNavigator } from './navigation/RootNavigator';
import { API_URL } from './config/constants';
import { CustomSplashScreen } from './components/CustomSplashScreen';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [showCustomSplash, setShowCustomSplash] = useState(true);

  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: API_URL,
        }),
      ],
    })
  );

  useEffect(() => {
    async function prepare() {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn(e);
      } finally {
        setAppReady(true);
      }
    }

    prepare();
  }, []);

  const onCustomSplashFinish = useCallback(() => {
    setShowCustomSplash(false);
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <RootNavigator />
        {showCustomSplash && (
          <CustomSplashScreen isReady={appReady} onFinish={onCustomSplashFinish} />
        )}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
