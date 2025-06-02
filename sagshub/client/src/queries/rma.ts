import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { RMASchema } from "@shared/schema";

interface PaginatedResponse {
  items: z.infer<typeof RMASchema>[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

type RMAQueryParams = {
  customerId?: number;
  page?: number;
  pageSize?: number;
  status?: string;
  sort?: string;
};

// Query for at hente RMAer med filtrering
export const useRMAsQuery = (params: RMAQueryParams = {}, options?: { enabled?: boolean }) => {
  const queryString = new URLSearchParams();
  
  if (params.customerId) queryString.append("customerId", params.customerId.toString());
  if (params.page) queryString.append("page", params.page.toString());
  if (params.pageSize) queryString.append("pageSize", params.pageSize.toString());
  if (params.status) queryString.append("status", params.status);
  if (params.sort) queryString.append("sort", params.sort);

  return useQuery<PaginatedResponse>({
    queryKey: ["rmas", params],
    queryFn: async () => {
      const response = await fetch(`/api/rma?${queryString}`);
      if (!response.ok) {
        throw new Error("Kunne ikke hente RMAer");
      }
      const data = await response.json();
      return data;
    },
    enabled: options?.enabled,
  });
}; 