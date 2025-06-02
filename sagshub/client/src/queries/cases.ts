import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { CaseWithCustomer, StatusHistory } from '@/types';

interface UseCasesQueryOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  treatment?: string;
  priority?: string;
  sort?: string;
  searchTerm?: string;
  customerId?: number;
  isWorker?: boolean;
  alarmOnly?: boolean;
  enabled?: boolean;
  includeCompleted?: boolean;
}

interface PaginatedResponse<T = CaseWithCustomer> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const CACHE_TIME = 5 * 60 * 1000; // 5 minutter
const STALE_TIME = 60 * 1000; // 1 minut
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 sekund

export function useCasesQuery(options: UseCasesQueryOptions = {}) {
  const queryClient = useQueryClient();

  return useQuery<PaginatedResponse>({
    queryKey: ["cases", options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.page) params.append("page", options.page.toString());
      if (options.pageSize) params.append("pageSize", options.pageSize.toString());
      if (options.status && options.status !== "all") params.append("status", options.status);
      if (options.treatment && options.treatment !== "all") params.append("treatment", options.treatment);
      if (options.priority && options.priority !== "all") params.append("priority", options.priority);
      if (options.sort) params.append("sort", options.sort);
      if (options.searchTerm) params.append("searchTerm", options.searchTerm);
      if (options.customerId) params.append("customerId", options.customerId.toString());
      if (options.isWorker) params.append("isWorker", "true");
      if (options.alarmOnly) params.append("alarmOnly", "true");
      if (options.includeCompleted) params.append("includeCompleted", "true");

      // Add timestamp to prevent caching
      params.append('_t', Date.now().toString());
      
      const url = `/api/cases?${params.toString()}`;
      console.log("useCasesQuery fetching:", { url, options });
      const response = await apiRequest("GET", url);
      const result = await response.json();
      console.log("useCasesQuery result:", { url, itemsCount: result?.items?.length, total: result?.total, totalPages: result?.totalPages });
      return result;
    },
    enabled: options.enabled !== false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    useErrorBoundary: true,
    onError: (error) => {
      console.error('Error fetching cases:', error);
    },
  });
}

export function useCaseStatusHistory(caseId: number) {
  const queryClient = useQueryClient();

  return useQuery<StatusHistory[]>({
    queryKey: ["case-status-history", caseId],
    queryFn: async () => {
      if (!caseId) {
        throw new Error("Case ID is required");
      }
      const response = await apiRequest("GET", `/api/cases/${caseId}/status-history`);
      return response.json();
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 1000 * 60, // 1 minute
    cacheTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    useErrorBoundary: true,
    onError: (error) => {
      console.error('Error fetching case status history:', error);
    },
  });
}

export type StatusHistoryItem = StatusHistory;

export function useTotalCasesQuery() {
  const queryClient = useQueryClient();

  return useQuery<{ total: number }>({
    queryKey: ["total-cases"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/cases/total");
      return response.json();
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 1000 * 60, // 1 minute
    cacheTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    useErrorBoundary: true,
    onError: (error) => {
      console.error('Error fetching total cases:', error);
    },
  });
}

export function useStatusCountsQuery() {
  const queryClient = useQueryClient();

  return useQuery<Record<string, number>>({
    queryKey: ["status-counts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/cases/status-counts");
      return response.json();
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 1000 * 60, // 1 minute
    cacheTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    useErrorBoundary: true,
    onError: (error) => {
      console.error('Error fetching status counts:', error);
    },
  });
}

export function useAlarmCasesQuery() {
  const queryClient = useQueryClient();

  return useQuery<CaseWithCustomer[]>({
    queryKey: ["alarm-cases"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/cases/alarm");
      return response.json();
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 1000 * 60, // 1 minute
    cacheTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    useErrorBoundary: true,
    onError: (error) => {
      console.error('Error fetching alarm cases:', error);
    },
  });
}

export function useUpdateCaseMutation() {
  const queryClient = useQueryClient();

  return useMutation<CaseWithCustomer, Error, { id: number; data: Partial<CaseWithCustomer> }>({
    mutationFn: async ({ id, data }) => {
      const response = await apiRequest("PATCH", `/api/cases/${id}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["case-status-history", data.id] });
      queryClient.invalidateQueries({ queryKey: ["status-counts"] });
      queryClient.invalidateQueries({ queryKey: ["alarm-cases"] });
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    useErrorBoundary: true,
    onError: (error) => {
      console.error('Error updating case:', error);
    },
  });
}

export function useUpdateCaseStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation<StatusHistory, Error, { id: number; status: string }>({
    mutationFn: async ({ id, status }) => {
      const response = await apiRequest("POST", `/api/cases/${id}/status`, { status });
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["case-status-history", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["status-counts"] });
      queryClient.invalidateQueries({ queryKey: ["alarm-cases"] });
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    useErrorBoundary: true,
    onError: (error) => {
      console.error('Error updating case status:', error);
    },
  });
} 