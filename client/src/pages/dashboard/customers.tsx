import { useQuery, useMutation } from "@tanstack/react-query";
import { Customer, InsertCustomer } from "@shared/schema";
import { CustomerList } from "@/components/customer-list";
import { CustomerForm } from "@/components/customer-form";
import { CustomerView } from "@/components/customer-view";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Search } from "lucide-react"; 
import { MenuLayout } from "@/components/menu-layout";
import { PaginationNav } from "@/components/pagination-nav";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect, useRef, useCallback } from "react";

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function CustomersPage() {
  const { toast } = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce søgning manuelt med useRef
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Nulstil side når søgning ændres
    }, 800); // Øget til 800ms for at give mere tid

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm]);

  const { data: customersData, isLoading, error } = useQuery<PaginatedResponse<Customer>>({
    queryKey: ["customers", currentPage, debouncedSearch],
    queryFn: async () => {
      const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch.trim())}` : "";
      const url = `/api/customers?page=${currentPage}&pageSize=10${searchParam}`;
      console.log('Fetching customers with URL:', url);
      console.log('Search term:', searchTerm, 'Debounced:', debouncedSearch);
      
      const res = await apiRequest("GET", url);
      
      if (!res.ok) {
        throw new Error(`Fejl ved hentning af kunder: ${res.status}`);
      }
      
      return res.json();
    },
    staleTime: 1000 * 30, // 30 sekunder
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: InsertCustomer) => {
      const res = await apiRequest("POST", "/api/customers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: "Succes",
        description: "Kunden er oprettet",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fejl",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <MenuLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MenuLayout>
    );
  }

  return (
    <MenuLayout>
      <div className="p-1">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Kunder</h2>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                type="text"
              placeholder="Søg efter kunder..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[300px] pl-8"
            />
            </div>
            <Button onClick={() => setShowCreateCustomer(true)}>
              <Plus className="mr-2 h-4 w-4" /> Opret kunde
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <CustomerList
            customers={customersData?.items || []}
            onSelectCustomer={setSelectedCustomer}
            disableLocalSorting={true}
          />
          <div className="mt-4">
            <PaginationNav
              currentPage={currentPage}
              totalPages={customersData?.totalPages || 1}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>

        {selectedCustomer && (
          <CustomerView
            customer={selectedCustomer}
            onClose={() => setSelectedCustomer(null)}
          />
        )}

        <Sheet open={showCreateCustomer} onOpenChange={setShowCreateCustomer}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Opret ny kunde</SheetTitle>
            </SheetHeader>
            <CustomerForm
              onSubmit={async (data) => {
                await createCustomerMutation.mutateAsync(data);
                setShowCreateCustomer(false);
              }}
            />
          </SheetContent>
        </Sheet>
      </div>
    </MenuLayout>
  );
}