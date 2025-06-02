import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { CustomerSchema, type Customer } from "@shared/schema";

// Schema for søgeresultater
const customerSearchResultSchema = z.object({
  data: z.array(CustomerSchema),
  totalItems: z.number(),
  totalPages: z.number(),
  currentPage: z.number(),
});

type CustomerSearchResult = z.infer<typeof customerSearchResultSchema>;

// Query for at hente en enkelt kunde
export const useCustomerQuery = (id: number, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/customers/${id}`);
      if (!response.ok) {
        throw new Error("Kunne ikke hente kunde");
      }
      const data = await response.json();
      return CustomerSchema.parse(data);
    },
    enabled: options?.enabled,
  });
};

// Query for at søge efter kunder
export const useCustomerSearchQuery = (searchTerm: string) => {
  return useQuery<Customer[]>({
    queryKey: ["customers", "search", searchTerm],
    queryFn: async () => {
      console.log("Searching for customers with term:", searchTerm);
      try {
        const response = await fetch(`/api/customers/search?q=${encodeURIComponent(searchTerm)}`, {
          credentials: 'include'
        });
        
        if (response.status === 403) {
          console.error("Access forbidden - user is not a worker");
          return [];
        }
        
        if (!response.ok) {
          throw new Error("Kunne ikke søge efter kunder");
        }
        
        const data = await response.json();
        console.log("Raw customer search response:", JSON.stringify(data, null, 2));
        
        // Validate the response data
        if (!Array.isArray(data)) {
          console.error("Expected array of customers, got:", typeof data);
          return [];
        }
        
        // Check each customer object
        const validCustomers = data.filter(customer => {
          const hasRequiredFields = customer && typeof customer === 'object' && 
            'id' in customer && 
            'name' in customer && 
            'phone' in customer;
          if (!hasRequiredFields) {
            console.error("Invalid customer object:", customer);
          }
          return hasRequiredFields;
        });
        
        console.log("Validated customers:", validCustomers);
        return validCustomers;
      } catch (error) {
        console.error("Error searching customers:", error);
        throw error;
      }
    },
    enabled: true,
  });
};

export const useAllCustomersQuery = () => {
  return useQuery({
    queryKey: ["customers", "all"],
    queryFn: async () => {
      const res = await fetch("/api/customers?page=1&pageSize=5000", { credentials: "include" });
      const data = await res.json();
      return data.items || [];
    }
  });
}; 