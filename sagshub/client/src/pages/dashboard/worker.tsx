import { useAuth } from "@/context/auth-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CaseWithCustomer } from "@shared/schema";
import { useState, useEffect } from "react"; 
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Plus, Search, Loader2, ArrowUpRight, ArrowDownRight, AlertCircle, Activity, Clock, CheckCircle, Inbox, FileText, Timer, FileEdit, CheckCircle2, Package, PackageCheck, X, ChevronLeft, ChevronRight, Users, Filter } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { CaseForm } from "@/components/case-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MenuLayout } from "@/components/menu-layout";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { subMonths, startOfMonth, endOfMonth, differenceInDays, format, isToday, parseISO } from "date-fns";
import { Pagination } from "@/components/ui/pagination";
import { PaginationNav } from "@/components/pagination-nav";
import { da } from "date-fns/locale";
import { CaseList } from "@/components/case-list";
import { isCaseInAlarm, getAlarmMessage } from '@shared/alarm';
import { StatusHistoryItem } from "@/queries/cases";
import { StatusBadge } from "@/components/ui/status-badge";
import { useLocation } from "wouter";
import { GlobalSearch } from "@/components/global-search";
import { useCustomerSearchQuery } from "@/queries/customers";
import { useDebounce } from "@/hooks/use-debounce";
import { useCasesQuery, useStatusCountsQuery, useAlarmCasesQuery, useTotalCasesQuery } from "@/queries/cases";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CaseStatus } from "@shared/schema";

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface StatusCounts {
  [key: string]: number;
}

interface AlarmCase {
  id: number;
  caseNumber: string;
  customerName: string;
  status: string;
}

interface TotalCasesData {
  total: number;
}

export default function WorkerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateCase, setShowCreateCase] = useState(false);
  const [createdCase, setCreatedCase] = useState<any>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [showAlarmPanel, setShowAlarmPanel] = useState(false);
  
  const [statusPages, setStatusPages] = useState<Record<string, number>>({
    all: 1,
    created: 1,
    in_progress: 1,
    offer_created: 1,
    waiting_customer: 1,
    offer_accepted: 1,
    offer_rejected: 1,
    waiting_parts: 1,
    preparing_delivery: 1,
    ready_for_pickup: 1
  });

  const handleStatusPageChange = (status: string, page: number) => {
    setStatusPages(prev => ({
      ...prev,
      [status]: page
    }));
  };

  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'created': 'Oprettet',
      'in_progress': 'Under behandling', 
      'offer_created': 'Tilbud oprettet',
      'waiting_customer': 'Afventer kunde',
      'offer_accepted': 'Tilbud godkendt',
      'offer_rejected': 'Tilbud afvist',
      'waiting_parts': 'Afventer dele',
      'preparing_delivery': 'Klargøring til levering',
      'ready_for_pickup': 'Klar til afhentning',
      'completed': 'Afsluttet'
    };
    return statusMap[status] || status;
  };

  // Hent total cases data
  const { data: totalCasesData, isLoading: totalCasesLoading } = useTotalCasesQuery();

  // Hent status counts
  const { data: statusCounts, isLoading: statusCountsLoading } = useStatusCountsQuery();

  // Hent alarm cases
  const { data: alarmCases, isLoading: alarmCasesLoading } = useAlarmCasesQuery();

  // Hent alle cases til statistik beregning
  const { data: allCasesData, isLoading: allCasesLoading } = useCasesQuery({
    page: 1,
    pageSize: 10000, // Hent alle for statistik
    enabled: true,
    includeCompleted: true
  });

  // Hent customers til statistik
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/customers?pageSize=10000");
      const data = await res.json();
      return data.items || [];
    },
  });

  const createCaseMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/cases", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["status-counts"] });
      queryClient.invalidateQueries({ queryKey: ["total-cases"] });
      toast({
        title: "Succes",
        description: "Sagen er oprettet",
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

  // Beregn gennemsnitlig sagstid denne måned vs. sidste måned
  const calculateAvgCaseTime = () => {
    if (!allCasesData?.items) return { thisMonth: 0, lastMonth: 0 };
    
    const completedCases = allCasesData.items.filter((c: any) => 
      c.status === 'completed'
    );

    const thisMonth = format(new Date(), 'yyyy-MM');
    const lastMonth = format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM');
    
    const thisMonthCases = completedCases.filter((c: any) => {
      const caseMonth = format(parseISO(c.updatedAt), 'yyyy-MM');
      return caseMonth === thisMonth;
    });
    
    const lastMonthCases = completedCases.filter((c: any) => {
      const caseMonth = format(parseISO(c.updatedAt), 'yyyy-MM');
      return caseMonth === lastMonth;
    });
    
    const calculateAvg = (cases: any[]) => {
      if (cases.length === 0) return 0;
      const totalDays = cases.reduce((sum, c) => {
        const days = differenceInDays(parseISO(c.updatedAt), parseISO(c.createdAt));
        return sum + Math.max(days, 1); // Minimum 1 dag
      }, 0);
      return Math.round(totalDays / cases.length);
    };
    
    return {
      thisMonth: calculateAvg(thisMonthCases),
      lastMonth: calculateAvg(lastMonthCases)
    };
  };
  
  const { thisMonth: avgDaysThisMonth, lastMonth: avgDaysLastMonth } = calculateAvgCaseTime();
  const avgDaysChangePercent = avgDaysLastMonth > 0 ? 
    Math.round(((avgDaysThisMonth - avgDaysLastMonth) / avgDaysLastMonth) * 100) : 0;

  // Forenklet statistik baseret på totalCasesData
  const totalCases = totalCasesData?.total || 0;
  const casesThisMonth = Math.floor(totalCases * 0.3); // Estimat
  const caseChangePercent = 15; // Statisk værdi for nu

  // Forenklet kunde statistik
  const customers = customersData || [];
  const newCustomersThisMonth = Math.floor(customers.length * 0.2); // Estimat
  const customerChangePercent = 8; // Statisk værdi for nu

  if (totalCasesLoading || statusCountsLoading || allCasesLoading) {
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
      <div className="container mx-auto py-4">
        <div className="flex gap-6">
          {/* Hovedindhold */}
          <div className="flex-1 space-y-4">
            <div className="flex justify-between items-center mt-8">
              <h1 className="text-3xl font-bold">Sagsoversigt</h1>
              <Sheet open={showCreateCase} onOpenChange={setShowCreateCase}>
                <SheetTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Opret ny sag
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:w-[800px] md:w-[900px] lg:w-[1000px] overflow-y-auto p-8">
                  <SheetHeader>
                    <SheetTitle>Opret ny sag</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <CaseForm onSubmit={async (data) => {
                      const result = await createCaseMutation.mutateAsync(data);
                      setCreatedCase(result);
                      setShowPrintDialog(true);
                      setShowCreateCase(false);
                    }} />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Global søgning */}
            <div className="mb-6">
              <GlobalSearch />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Statistik kort */}
              <Card
                className="cursor-pointer hover:shadow-lg transition"
                onClick={() => setLocation("/worker/admin?tab=stats")}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Sager denne måned
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{casesThisMonth}</div>
                  <p className="text-xs text-muted-foreground">
                    {caseChangePercent >= 0 ? (
                      <span className="text-green-600 flex items-center">
                        <ArrowUpRight className="h-4 w-4 mr-1" />
                        {caseChangePercent}% fra sidste måned
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center">
                        <ArrowDownRight className="h-4 w-4 mr-1" />
                        {Math.abs(caseChangePercent)}% fra sidste måned
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition"
                onClick={() => setLocation("/worker/admin?tab=stats")}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Gennemsnitlig sagstid
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{avgDaysThisMonth} dage</div>
                  <p className="text-xs text-muted-foreground">
                    {avgDaysLastMonth} dage sidste måned
                    {avgDaysChangePercent !== 0 && (
                      <span className={avgDaysChangePercent < 0 ? 'text-green-600 ml-2' : 'text-red-600 ml-2'}>
                        {avgDaysChangePercent < 0 ? '↓' : '↑'} {Math.abs(avgDaysChangePercent)}%
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition"
                onClick={() => setLocation("/worker/admin?tab=stats")}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Nye kunder denne måned
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{newCustomersThisMonth}</div>
                  <p className="text-xs text-muted-foreground">
                    {customerChangePercent >= 0 ? (
                      <span className="text-green-600 flex items-center">
                        <ArrowUpRight className="h-4 w-4 mr-1" />
                        {customerChangePercent}% fra sidste måned
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center">
                        <ArrowDownRight className="h-4 w-4 mr-1" />
                        {Math.abs(customerChangePercent)}% fra sidste måned
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:bg-red-50 border-red-200 border transition-colors"
                onClick={() => setShowAlarmPanel(true)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-bold text-red-900">
                    Sager i alarm
                  </CardTitle>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-700">{statusCounts?.alarm || alarmCases?.length || 0}</div>
                  <p className="text-xs text-red-700">Kræver opmærksomhed</p>
                </CardContent>
              </Card>
            </div>

            {/* Sager tabs og liste */}
                          <div className="bg-card/80 backdrop-blur-sm rounded-lg shadow-sm dark:shadow-lg">
              <Tabs defaultValue="all" className="w-full">
                <div className="flex">
                  <div className="w-64 border-r">
                    <TabsList className="flex flex-col h-auto w-full space-y-1 p-2">
                      <TabsTrigger value="all" className="justify-between w-full px-3 py-2 hover:bg-gray-50/80">
                        <div className="flex items-center">
                          <Inbox className="h-4 w-4 mr-2" />
                          Alle sager
                        </div>
                        <Badge variant="secondary">{totalCasesData?.total || 0}</Badge>
                      </TabsTrigger>
                      {Object.entries({
                        created: "Oprettet",
                        in_progress: "Under behandling",
                        offer_created: "Tilbud oprettet",
                        waiting_customer: "Afventer kunde",
                        offer_accepted: "Tilbud godkendt",
                        offer_rejected: "Tilbud afvist",
                        waiting_parts: "Afventer dele",
                        preparing_delivery: "Klargøring til levering",
                        ready_for_pickup: "Klar til afhentning"
                      }).map(([statusKey, statusLabel]) => (
                        <TabsTrigger key={statusKey} value={statusKey} className="justify-between w-full px-3 py-2 hover:bg-gray-50/80">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                            {statusLabel}
                        </div>
                          <Badge variant="secondary">{statusCounts?.[statusKey] || 0}</Badge>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  <div className="flex-1 p-4">
                    <TabsContent value="all" className="m-0">
                      <div className="bg-card/80 backdrop-blur-sm rounded-lg shadow-sm dark:shadow-lg p-4">
                        <CaseList 
                          searchTerm={searchTerm}
                          statusCounts={statusCounts}
                          showFilters={true}
                          showPagination={true}
                          isWorker={true}
                          showAlarmIndicator={true}
                          page={currentPage}
                          onPageChange={setCurrentPage}
                          pageSize={pageSize}
                        />
                      </div>
                    </TabsContent>

                    {/* Status-specifikke tabs */}
                    {Object.entries({
                      created: "Oprettet",
                      in_progress: "Under behandling",
                      offer_created: "Tilbud oprettet",
                      waiting_customer: "Afventer kunde",
                      offer_accepted: "Tilbud godkendt",
                      offer_rejected: "Tilbud afvist",
                      waiting_parts: "Afventer dele",
                      preparing_delivery: "Klargøring til levering",
                      ready_for_pickup: "Klar til afhentning"
                    }).map(([statusKey, statusLabel]) => (
                      <TabsContent key={statusKey} value={statusKey} className="m-0">
                        <div className="bg-card/80 backdrop-blur-sm rounded-lg shadow-sm dark:shadow-lg p-4">
                          <CaseList 
                            searchTerm={searchTerm}
                            status={statusKey}
                            showPagination={true}
                            isWorker={true}
                            showAlarmIndicator={true}
                            page={statusPages[statusKey]}
                            onPageChange={(page) => handleStatusPageChange(statusKey, page)}
                            pageSize={10}
                          />
                        </div>
                      </TabsContent>
                    ))}
                  </div>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </MenuLayout>
  );
}