import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { UserSchema } from "@shared/schema";

// Schema for bruger søgeresultater
const userSearchResultSchema = z.object({
  data: z.array(UserSchema),
  totalItems: z.number(),
  totalPages: z.number(),
  currentPage: z.number(),
});

type UserSearchResult = z.infer<typeof userSearchResultSchema>;

type UserQueryParams = {
  page?: number;
  pageSize?: number;
  role?: string;
  sort?: string;
};

// Query for at hente brugere
export const useUsersQuery = (params: UserQueryParams = {}) => {
  const queryString = new URLSearchParams();
  
  if (params.page) queryString.append("page", params.page.toString());
  if (params.pageSize) queryString.append("pageSize", params.pageSize.toString());
  if (params.role) queryString.append("role", params.role);
  if (params.sort) queryString.append("sort", params.sort);

  return useQuery({
    queryKey: ["users", params],
    queryFn: async () => {
      const response = await fetch(`/api/users?${queryString}`);
      if (!response.ok) {
        throw new Error("Kunne ikke hente brugere");
      }
      const data = await response.json();
      return userSearchResultSchema.parse(data);
    },
  });
}; 