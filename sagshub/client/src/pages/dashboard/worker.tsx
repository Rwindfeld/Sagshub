import { useAuth } from "@/hooks/auth";
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
import { PrintFollowupDialog } from "@/components/print-followup-dialog";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusHistoryMap, setStatusHistoryMap] = useState<Record<number, StatusHistoryItem[]>>({});
  const [showCreateCase, setShowCreateCase] = useState(false);
  const [showAlarmCases, setShowAlarmCases] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<string>('');
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [createdCase, setCreatedCase] = useState<CaseWithCustomer | null>(null);

  // Separate pagination states for each status tab
  const [statusPages, setStatusPages] = useState<Record<string, number>>({
    created: 1,
    in_progress: 1,
    offer_created: 1,
    waiting_customer: 1,
    offer_accepted: 1,
    offer_rejected: 1,
    waiting_parts: 1,
    preparing_delivery: 1,
    ready_for_pickup: 1,
  });

  // Handler for status-specific page changes
  const handleStatusPageChange = (status: string, page: number) => {
    setStatusPages(prev => ({
      ...prev,
      [status]: page
    }));
  };

  // Function to translate status to Danish
  const formatStatus = (status: string) => {
    const statuses = {
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
    return statuses[status as keyof typeof statuses] || status;
  };

  const { data: totalCasesData } = useTotalCasesQuery() as { data: TotalCasesData | undefined };

  // CaseList komponenten håndterer nu sin egen data fetching

  const { data: customersData, isLoading: customersLoading } = useCustomerSearchQuery("");

  const createCaseMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/cases", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
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

  const { data: statusCounts, isLoading: isLoadingStatusCounts } = useStatusCountsQuery() as { 
    data: StatusCounts | undefined; 
    isLoading: boolean 
  };

  // CaseList komponenten håndterer nu sin egen status historik

  const { data: alarmCases, isLoading: isLoadingAlarms } = useAlarmCasesQuery() as { 
    data: AlarmCase[] | undefined; 
    isLoading: boolean 
  };
  const [showAlarmPanel, setShowAlarmPanel] = useState(false);

  const isLoading = customersLoading || isLoadingStatusCounts || isLoadingAlarms;

  useEffect(() => {
    if (!user?.isWorker) {
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  if (!user?.isWorker) {
    return null;
  }

  // Beregn rigtig gennemsnitlig sagstid fra afsluttede sager
  const { data: allCasesForStats } = useCasesQuery({ 
    page: 1, 
    pageSize: 5000,
    includeCompleted: true // Inkluder afsluttede sager til statistikker
  });
  
  const calculateAvgCaseTime = () => {
    if (!allCasesForStats) return { thisMonth: 0, lastMonth: 0 };
    
    const cases = Array.isArray(allCasesForStats) ? allCasesForStats : (allCasesForStats?.items || []);
    
    // Filtrer kun afsluttede sager (completed, ready_for_pickup)
    const completedCases = cases.filter((c: any) => 
      c.status === 'completed' || c.status === 'ready_for_pickup'
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
        return sum + differenceInDays(parseISO(c.updatedAt), parseISO(c.createdAt));
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

  return (
    <MenuLayout>
      <div className="container mx-auto py-4">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center mt-8">
            <h1 className="text-3xl font-bold">Sagsoversigt</h1>
            <Sheet open={showCreateCase} onOpenChange={setShowCreateCase}>
              <SheetTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Opret ny sag
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Opret ny sag</SheetTitle>
                </SheetHeader>
                <CaseForm onSubmit={async (data) => {
                  const result = await createCaseMutation.mutateAsync(data);
                  setCreatedCase(result);
                  setShowPrintDialog(true);
                  // Sheet lukkes først når print-popup er håndteret
                }} />
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
                <div className="text-2xl font-bold text-red-700">{alarmCases?.length || 0}</div>
                <p className="text-xs text-red-700">Kræver opmærksomhed</p>
              </CardContent>
            </Card>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm">
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
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <Search className="h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Søg efter sager..."
                          className="flex-1 bg-transparent border-none pl-0 focus-visible:ring-0"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
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

                  <TabsContent value="created" className="m-0">
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <Search className="h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Søg efter oprettede sager..."
                          className="flex-1 bg-transparent border-none pl-0 focus-visible:ring-0"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <CaseList 
                        searchTerm={searchTerm}
                        status="created"
                        showPagination={true}
                        isWorker={true}
                        showAlarmIndicator={true}
                        page={statusPages.created}
                        onPageChange={(page) => handleStatusPageChange('created', page)}
                        pageSize={10}
                      />

                    </div>
                  </TabsContent>

                  <TabsContent value="in_progress" className="m-0">
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <Search className="h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Søg efter sager under behandling..."
                          className="flex-1 bg-transparent border-none pl-0 focus-visible:ring-0"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <CaseList 
                        searchTerm={searchTerm}
                        status="in_progress"
                        showPagination={true}
                        isWorker={true}
                        showAlarmIndicator={true}
                        page={statusPages.in_progress}
                        onPageChange={(page) => handleStatusPageChange('in_progress', page)}
                        pageSize={10}
                      />
                      
                    </div>
                  </TabsContent>

                  <TabsContent value="offer_created" className="m-0">
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <Search className="h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Søg efter sager med oprettet tilbud..."
                          className="flex-1 bg-transparent border-none pl-0 focus-visible:ring-0"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <CaseList 
                        searchTerm={searchTerm}
                        status="offer_created"
                        showPagination={true}
                        isWorker={true}
                        showAlarmIndicator={true}
                        page={statusPages.offer_created}
                        onPageChange={(page) => handleStatusPageChange('offer_created', page)}
                        pageSize={10}
                      />

                    </div>
                  </TabsContent>

                  <TabsContent value="waiting_customer" className="m-0">
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <Search className="h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Søg efter sager der afventer kunde..."
                          className="flex-1 bg-transparent border-none pl-0 focus-visible:ring-0"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <CaseList 
                        searchTerm={searchTerm}
                        status="waiting_customer"
                        showPagination={true}
                        isWorker={true}
                        showAlarmIndicator={true}
                        page={statusPages.waiting_customer}
                        onPageChange={(page) => handleStatusPageChange('waiting_customer', page)}
                        pageSize={10}
                      />

                    </div>
                  </TabsContent>

                  <TabsContent value="offer_accepted" className="m-0">
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <Search className="h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Søg efter sager med godkendt tilbud..."
                          className="flex-1 bg-transparent border-none pl-0 focus-visible:ring-0"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <CaseList 
                        searchTerm={searchTerm}
                        status="offer_accepted"
                        showPagination={true}
                        isWorker={true}
                        showAlarmIndicator={true}
                        page={statusPages.offer_accepted}
                        onPageChange={(page) => handleStatusPageChange('offer_accepted', page)}
                        pageSize={10}
                      />

                    </div>
                  </TabsContent>

                  <TabsContent value="waiting_parts" className="m-0">
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <Search className="h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Søg efter sager der afventer dele..."
                          className="flex-1 bg-transparent border-none pl-0 focus-visible:ring-0"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <CaseList 
                        searchTerm={searchTerm}
                        status="waiting_parts"
                        showPagination={true}
                        isWorker={true}
                        showAlarmIndicator={true}
                        page={statusPages.waiting_parts}
                        onPageChange={(page) => handleStatusPageChange('waiting_parts', page)}
                        pageSize={10}
                      />

                    </div>
                  </TabsContent>

                  <TabsContent value="ready_for_pickup" className="m-0">
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <Search className="h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Søg efter sager klar til afhentning..."
                          className="flex-1 bg-transparent border-none pl-0 focus-visible:ring-0"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <CaseList 
                        searchTerm={searchTerm}
                        status="ready_for_pickup"
                        showPagination={true}
                        isWorker={true}
                        showAlarmIndicator={true}
                        page={statusPages.ready_for_pickup}
                        onPageChange={(page) => handleStatusPageChange('ready_for_pickup', page)}
                        pageSize={10}
                      />

                    </div>
                  </TabsContent>

                  <TabsContent value="offer_rejected" className="m-0">
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <Search className="h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Søg efter sager med afvist tilbud..."
                          className="flex-1 bg-transparent border-none pl-0 focus-visible:ring-0"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <CaseList 
                        searchTerm={searchTerm}
                        status="offer_rejected"
                        showPagination={true}
                        isWorker={true}
                        showAlarmIndicator={true}
                        page={statusPages.offer_rejected}
                        onPageChange={(page) => handleStatusPageChange('offer_rejected', page)}
                        pageSize={10}
                      />

                    </div>
                  </TabsContent>

                  <TabsContent value="preparing_delivery" className="m-0">
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <Search className="h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Søg efter sager under klargøring..."
                          className="flex-1 bg-transparent border-none pl-0 focus-visible:ring-0"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <CaseList 
                        searchTerm={searchTerm}
                        status="preparing_delivery"
                        showPagination={true}
                        isWorker={true}
                        showAlarmIndicator={true}
                        page={statusPages.preparing_delivery}
                        onPageChange={(page) => handleStatusPageChange('preparing_delivery', page)}
                        pageSize={10}
                      />

                    </div>
                  </TabsContent>
                </div>
              </div>
            </Tabs>
          </div>
        </div>
      </div>

      <Sheet open={showAlarmPanel} onOpenChange={setShowAlarmPanel}>
        <SheetContent side="right" className="w-full sm:w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Sager i alarm ({alarmCases?.length || 0})
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            {isLoadingAlarms ? (
              <div>Indlæser...</div>
            ) : alarmCases?.length === 0 ? (
              <div>Ingen sager i alarm 🎉</div>
            ) : (
              alarmCases?.map((c: AlarmCase) => (
                <div
                  key={c.id}
                  className="p-3 bg-red-50 border border-red-200 rounded cursor-pointer hover:bg-red-100 transition"
                  onClick={() => setLocation(`/worker/cases/${c.id}`)}
                >
                  <div className="font-semibold text-red-900">Sag #{c.caseNumber} - {c.customerName}</div>
                  <div className="text-xs text-red-700">Status: {formatStatus(c.status)}</div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      <PrintFollowupDialog
        isOpen={showPrintDialog}
        onClose={() => setShowPrintDialog(false)}
        onPrint={() => {
          if (createdCase) {
            const printUrl = `/print/followup?caseId=${createdCase.id}`;
            window.open(printUrl, '_blank');
          }
          setShowPrintDialog(false);
          setShowCreateCase(false);
        }}
        onSkip={() => {
          setShowPrintDialog(false);
          setShowCreateCase(false);
        }}
        caseData={createdCase || undefined}
      />
    </MenuLayout>
  );
}