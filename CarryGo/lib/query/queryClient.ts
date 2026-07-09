import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { retryDelay, shouldRetry } from '@/lib/retry';
import { captureException } from '@/lib/monitoring';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      captureException(error, {
        source: 'react-query',
        queryKey: JSON.stringify(query.queryKey),
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      captureException(error, {
        source: 'react-query-mutation',
        mutationKey: mutation.options.mutationKey
          ? JSON.stringify(mutation.options.mutationKey)
          : undefined,
      });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      retry: (failureCount, error) => shouldRetry(failureCount, error, 2),
      retryDelay: (attemptIndex) => retryDelay(attemptIndex),
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 0,
      networkMode: 'offlineFirst',
    },
  },
});
