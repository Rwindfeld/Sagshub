import { QueryClient } from '@tanstack/react-query';
// Fjern importen af '@/config' og brug en fallback BASE_URL
const BASE_URL = "http://localhost:3000"; // Backend API URL

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

export async function apiRequest(method: string, path: string, body?: any) {
  const url = `${BASE_URL}${path}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include', // Vigtig for session-baseret authentication
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    console.error('API request failed:', {
      url,
      method,
      status: response.status,
      error,
    });
    throw new Error(error.message || 'An error occurred');
  }

  return response;
}
