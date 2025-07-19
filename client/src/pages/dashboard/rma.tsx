import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { MenuLayout } from "@/components/menu-layout";
import { RMAForm } from "@/components/rma-form";
import { RMAList } from "@/components/rma-list";
import { PaginationNav } from "@/components/pagination-nav";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { RMA } from "@shared/schema";

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Define sort options
type SortOption = 'newest' | 'oldest' | 'default';

export default function RMADashboard() {
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Fetch RMA data
  const { data, isLoading, error } = useQuery<PaginatedResponse<RMA>>({
    queryKey: ["/api/rma", currentPage, searchQuery, sortBy, statusFilter],
    queryFn: async () => {
      let url = `/api/rma?page=${currentPage}&pageSize=20`; // Reduceret fra 100 til 20 for at undgå for store forespørgsler
      
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      
      if (sortBy !== 'default') {
        url += `&sort=${sortBy}`;
      }
      
      if (statusFilter) {
        url += `&status=${encodeURIComponent(statusFilter)}`;
      }
      
      try {
        const res = await apiRequest("GET", url);
        
        if (!res.ok) {
          throw new Error(`API svarede med status: ${res.status}`);
        }
        
        const jsonData = await res.json();
        console.log("RMA API response:", jsonData);
        
        // Sikrer at items-data er et array
        if (jsonData && !Array.isArray(jsonData.items)) {
          console.warn("API returnerede ikke et items array, tilpasser data struktur", jsonData);
          // Håndterer at items kan være undefined eller ikke et array
          jsonData.items = Array.isArray(jsonData.items) ? jsonData.items : [];
        }
        
        return jsonData;
      } catch (error) {
        console.error("Fejl ved hentning af RMA data:", error);
        throw error;
      }
    },
  });

  // Create RMA mutation
  const createRMAMutation = useMutation({
    mutationFn: async (formData: any) => {
      // Tilføj aktuel status
      const data = {
        ...formData,
        status: 'oprettet' // Brug den danske værdi fra RMAStatus.CREATED
      };
      
      const res = await apiRequest("POST", "/api/rma", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rma"] });
      toast({
        title: "Succes",
        description: "RMA sagen er oprettet",
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

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Reset til side 1 når man søger
    setCurrentPage(1);
  };
  
  // Handler for sort and filter changes
  const handleSortChange = (option: SortOption) => {
    setSortBy(option);
    setCurrentPage(1); // Reset to page 1 when sort changes
  };
  
  const handleStatusFilterChange = (status: string | null) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to page 1 when filter changes
  };

  // Vis fejlbesked hvis der er fejl i at hente data
  if (error) {
    return (
      <MenuLayout>
        <div className="p-1">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <p className="font-semibold">Der opstod en fejl ved hentning af RMA data</p>
            <p className="text-sm">{(error as Error).message}</p>
            <Button 
              variant="outline" 
              className="mt-2" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/rma"] })}
            >
              Prøv igen
            </Button>
          </div>
        </div>
      </MenuLayout>
    );
  }

  return (
    <MenuLayout>
      <div className="p-1">
        {/* Header sektion */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">RMA Oversigt</h1>
            <p className="text-muted-foreground">Håndter returneringer og reklamationer</p>
          </div>
          <div className="flex gap-4">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Søg RMA eller kundenavn..."
                className="pl-9 w-[250px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="default">
                  <Plus className="mr-2 h-4 w-4" />
                  Ny RMA
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:w-[600px] md:w-[800px] overflow-y-auto max-h-screen">
                <SheetHeader>
                  <SheetTitle>Opret ny RMA sag</SheetTitle>
                </SheetHeader>
                <div className="mt-6 pb-6 overflow-y-auto">
                  <RMAForm 
                    onSubmit={createRMAMutation.mutate}
                    isLoading={createRMAMutation.isPending}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* RMA Tabel */}
        <div className="bg-white rounded-lg shadow">
          <RMAList 
            rmaItems={data?.items || []}
            isLoading={isLoading}
            sortBy={sortBy}
            onSortChange={handleSortChange}
            statusFilter={statusFilter}
            onStatusFilterChange={handleStatusFilterChange}
            totalCount={data?.total || 0}
          />
          <div className="p-4">
            <PaginationNav
              currentPage={currentPage}
              totalPages={data?.totalPages || 1}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </div>
    </MenuLayout>
  );
}