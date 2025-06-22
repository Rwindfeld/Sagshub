import { useAuth } from "@/context/auth-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CaseWithCustomer } from "@shared/schema";
import { CaseList } from "@/components/case-list";
import { useState, useEffect } from "react";
import { MenuLayout } from "@/components/menu-layout";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CaseForm } from "@/components/case-form";
import { useCasesQuery } from "@/queries/cases";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { PaginationNav } from "@/components/pagination-nav";
import React from "react";
import { PrintFollowupDialog } from "@/components/print-followup-dialog";

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function CasesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(searchInput, 300);
  const [location, setLocation] = useLocation();

  // State for filter parametre
  const [urlTreatment, setUrlTreatment] = useState<string | null>(null);
  const [urlPriority, setUrlPriority] = useState<string | null>(null);
  const [urlSort, setUrlSort] = useState<string | null>(null);
  const [urlStatus, setUrlStatus] = useState<string | null>(null);

  // Læs URL parametre for filtre og opdater state når URL ændres
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const treatment = urlParams.get('treatment');
    const priority = urlParams.get('priority');
    const sort = urlParams.get('sort');
    const status = urlParams.get('status');
    
    console.log("Cases.tsx URL params changed:", { treatment, priority, sort, status });
    
    setUrlTreatment(treatment);
    setUrlPriority(priority);
    setUrlSort(sort);
    setUrlStatus(status);
  }, [location]);

  // CaseList håndterer nu sin egen data fetching

  // Hent statusCounts for hele databasen undtagen afsluttede
  const { data: statusCounts, isLoading: statusCountsLoading } = useQuery({
    queryKey: ['/api/cases/status-counts'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/cases/status-counts');
      const data = await res.json();
      
      // Konverter array format til objekt format hvis nødvendigt
      if (Array.isArray(data)) {
        const statusCountsObj = data.reduce((acc: Record<string, number>, item: any) => {
          // Filtrer completed status ud og konverter count til number
          if (item.status !== 'completed') {
            acc[item.status] = Number(item.count);
          }
          return acc;
        }, {});
        console.log('Converted status counts:', statusCountsObj);
        return statusCountsObj;
      }
      
      return data;
    }
  });

  const handlePageChange = (newPage: number) => {
    console.log('Changing to page:', newPage);
    setPage(newPage);
    
    // Opdater URL med ny side
    const params = new URLSearchParams(window.location.search);
    if (newPage > 1) {
      params.set('page', newPage.toString());
    } else {
      params.delete('page');
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
    
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const queryString = location.includes('?') ? location.split('?')[1] : '';
    const pageParam = new URLSearchParams(queryString).get('page');
    const newPage = Math.max(1, parseInt(pageParam || '1', 10) || 1);
    console.log('URL changed, setting page to:', newPage);
    setPage(newPage);
  }, [location]);

  // Fjernet invalidation her da CaseList komponenten håndterer det

  const createCaseMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/cases", {
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      toast({
        title: "Sag oprettet",
        description: "Sagen er blevet oprettet succesfuldt",
      });
    },
    onError: (error) => {
      toast({
        title: "Fejl ved oprettelse af sag",
        description: "Der opstod en fejl under oprettelse af sagen",
        variant: "destructive",
      });
    },
  });

  // Error handling er nu i CaseList komponenten

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [createdCase, setCreatedCase] = useState<CaseWithCustomer | null>(null);

  const handleCaseCreated = (data: any) => {
    queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
    toast({
      title: "Sag oprettet",
      description: "Sagen er blevet oprettet succesfuldt",
    });
    setCreatedCase(data);
    setShowPrintDialog(true);
    // Sheet lukkes først når print-popup er håndteret
  };

  const handlePrint = () => {
    if (createdCase) {
      const printUrl = `/print/followup?caseId=${createdCase.id}`;
      window.open(printUrl, '_blank');
    }
    setShowPrintDialog(false);
    setIsSheetOpen(false);
  };

  const handleSkipPrint = () => {
    setShowPrintDialog(false);
    setIsSheetOpen(false);
  };

  return (
    <MenuLayout>
      <div className="flex flex-col min-h-full w-full">
        <div className="p-4 lg:p-8 w-full">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">Sager</h1>
              <p className="text-muted-foreground">
                Søg efter sager ved hjælp af sagsnummer eller kundenavn
              </p>
            </div>
            <div className="flex gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Søg sager eller kundenavn..."
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setPage(1); // Reset page when search changes
                  }}
                  className="pl-10 min-w-[300px]"
                />
              </div>
              <Sheet open={isSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="default" onClick={() => setIsSheetOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ny sag
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:w-[800px] md:w-[900px] lg:w-[1000px] overflow-y-auto p-8">
                  <SheetHeader>
                    <SheetTitle>Oprettelse af ny sag</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <CaseForm
                      onSubmit={async (data) => {
                        const res = await apiRequest("POST", "/api/cases", data);
                        if (!res.ok) {
                          const errorData = await res.json();
                          toast({
                            title: "Fejl ved oprettelse af sag",
                            description: errorData.message || "Der opstod en fejl under oprettelse af sagen",
                            variant: "destructive",
                          });
                          return;
                        }
                        const result = await res.json();
                        handleCaseCreated(result);
                      }}
                      isLoading={createCaseMutation.isPending}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="w-full">
            <div className="bg-white rounded-lg shadow">
            <CaseList 
              isWorker={true} 
              searchTerm={debouncedSearch}
              treatment={urlTreatment || undefined}
              priority={urlPriority || undefined}
              sort={(urlSort as 'newest' | 'oldest' | 'default') || undefined}
              status={urlStatus || undefined}
              showPagination={true}
              page={page}
              onPageChange={handlePageChange}
              pageSize={10}
              statusCounts={statusCounts}
              showAlarmIndicator={true}
            />
            </div>
          </div>
        </div>
      </div>
      <PrintFollowupDialog
        isOpen={showPrintDialog}
        onClose={() => setShowPrintDialog(false)}
        onPrint={handlePrint}
        onSkip={handleSkipPrint}
        caseData={createdCase || undefined}
      />
    </MenuLayout>
  );
}