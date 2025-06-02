import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Order, InsertOrder } from '@/types';

interface UseOrdersQueryOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  sort?: string;
  searchTerm?: string;
  customerId?: number;
}

interface PaginatedResponse<T = Order> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useOrdersQuery(options: UseOrdersQueryOptions = {}) {
  console.log("useOrdersQuery called with options:", options);

  return useQuery<PaginatedResponse>({
    queryKey: ["/api/orders", options],
    queryFn: async () => {
      console.log("Starting API request for orders");
      
      const params = new URLSearchParams();
      if (options.page) params.append("page", options.page.toString());
      if (options.pageSize) params.append("pageSize", options.pageSize.toString());
      if (options.status && options.status !== "all") params.append("status", options.status);
      if (options.sort) params.append("sort", options.sort);
      if (options.searchTerm) params.append("search", options.searchTerm);
      if (options.customerId) params.append("customerId", options.customerId.toString());

      const url = `/api/orders?${params.toString()}`;
      console.log("Making request to:", url);

      try {
        const response = await apiRequest("GET", url);
        const data = await response.json();
        console.log("Received orders response:", data);
        return data;
      } catch (error) {
        console.error("Error fetching orders:", error);
        throw error;
      }
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
    onError: (error) => {
      console.error('Error fetching orders:', error);
    },
  });
}

export function useOrderQuery(id: number) {
  const queryClient = useQueryClient();

  return useQuery<Order>({
    queryKey: ["orders", id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/orders/${id}`);
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
      console.error('Error fetching order:', error);
    },
    onSettled: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries();
    },
  });
}

export function useCreateOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation<Order, Error, Partial<Order>>({
    mutationFn: async (data) => {
      const response = await apiRequest("POST", "/api/orders", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", data.id] });
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    useErrorBoundary: true,
    onError: (error) => {
      console.error('Error creating order:', error);
    },
    onSettled: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries();
    },
  });
}

export function useUpdateOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation<Order, Error, { id: number; data: Partial<Order> }>({
    mutationFn: async ({ id, data }) => {
      const response = await apiRequest("PATCH", `/api/orders/${id}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", data.id] });
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    useErrorBoundary: true,
    onError: (error) => {
      console.error('Error updating order:', error);
    },
    onSettled: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries();
    },
  });
}

export function useDeleteOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await apiRequest("DELETE", `/api/orders/${id}`);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", id] });
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    useErrorBoundary: true,
    onError: (error) => {
      console.error('Error deleting order:', error);
    },
    onSettled: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries();
    },
  });
}

export function useOrdersByCaseQuery(caseId: number | undefined | null, options = {}) {
  return useQuery({
    queryKey: ["/api/cases", caseId, "orders"],
    queryFn: async () => {
      if (!caseId) {
        throw new Error("Sags-ID er påkrævet");
      }
      
      const res = await apiRequest("GET", `/api/cases/${caseId}/orders`);
      return res.json();
    },
    enabled: !!caseId,
    ...options
  });
}

export function useUpdateOrderStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${id}/status`, { status });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", data.id] });
    }
  });
} 