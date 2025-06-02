import { CaseWithCustomer } from "../../../shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, differenceInDays } from "date-fns";
import { da } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { StatusBadge } from "@/components/ui/status-badge";
import { AlertCircle, ChevronDown, Check, Loader2, X, Files, FileText, Clock, FileOutput, Users, CheckCircle2, Package, PackageCheck, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useCasesQuery } from "@/queries/cases";
import { PaginationNav } from "@/components/pagination-nav";
import { isCaseInAlarm, getAlarmMessage } from '@shared/alarm';
import { useCaseStatusHistory, StatusHistoryItem } from "@/queries/cases";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-8 text-red-500">
          <AlertCircle className="h-8 w-8 mr-2" />
          <span>Der opstod en fejl. Prøv at genindlæse siden.</span>
        </div>
      );
    }

    return this.props.children;
  }
}

// Formatters for display values
const formatTreatment = (treatment: string) => {
  const treatments = {
    'repair': 'Reparation',
    'warranty': 'Reklamation',
    'setup': 'Klargøring',
    'other': 'Andet'
  };
  return treatments[treatment as keyof typeof treatments] || treatment;
};

const formatPriority = (priority: string) => {
  const priorities = {
    'asap': 'Snarest muligt',
    'first_priority': 'Første prioritet',
    'four_days': '4 dage',
    'free_diagnosis': 'Gratis diagnose'
  };
  return priorities[priority as keyof typeof priorities] || priority;
};

const formatDeviceType = (deviceType: string) => {
  const deviceTypes = {
    'pc': 'PC',
    'laptop': 'Bærbar',
    'printer': 'Printer',
    'other': 'Andet'
  };
  return deviceTypes[deviceType as keyof typeof deviceTypes] || deviceType;
};

const formatDate = (date: string | Date) => {
  return format(new Date(date), "d. MMM yyyy", { locale: da });
};

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

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'created': 'bg-yellow-100 text-yellow-800',
    'in_progress': 'bg-blue-100 text-blue-800',
    'offer_created': 'bg-orange-100 text-orange-800',
    'waiting_customer': 'bg-purple-100 text-purple-800',
    'offer_accepted': 'bg-green-100 text-green-800',
    'offer_rejected': 'bg-red-100 text-red-800',
    'waiting_parts': 'bg-indigo-100 text-indigo-800',
    'preparing_delivery': 'bg-cyan-100 text-cyan-800',
    'ready_for_pickup': 'bg-emerald-100 text-emerald-800',
    'completed': 'bg-green-100 text-green-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

type SortOption = 'newest' | 'oldest' | 'default';

interface CaseListProps {
  isWorker?: boolean;
  isCustomerView?: boolean;
  searchTerm?: string;
  treatment?: string;
  priority?: string;
  sort?: 'newest' | 'oldest' | 'default';
  customerId?: number;
  status?: string;
  excludeStatus?: string;
  cases?: CaseWithCustomer[];
  showFilters?: boolean;
  showPagination?: boolean;
  page?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  total?: number;
  totalPages?: number;
  isLoading?: boolean;
  statusCounts?: Record<string, number>;
  initialStatusHistoryMap?: Record<number, StatusHistoryItem[]>;
  showAlarmIndicator?: boolean;
}

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

const priorities = [
  { value: 'first_priority', label: 'Første prioritet' },
  { value: 'four_days', label: '4 dage' },
  { value: 'asap', label: 'Snarest muligt' },
  { value: 'free_diagnosis', label: 'Gratis diagnose' }
];

const treatments = [
  { value: 'repair', label: 'Reparation' },
  { value: 'warranty', label: 'Reklamation' },
  { value: 'setup', label: 'Klargøring' },
  { value: 'other', label: 'Andet' }
];

const sorts = [
  { value: 'newest', label: 'Nyeste først' },
  { value: 'oldest', label: 'Ældste først' }
];

interface CasesResponse {
  items: CaseWithCustomer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function CaseList({ 
  isWorker, 
  isCustomerView = false,
  searchTerm, 
  treatment: initialTreatment, 
  priority: initialPriority, 
  sort: initialSort, 
  customerId, 
  status: initialStatus, 
  excludeStatus, 
  cases: providedCases,
  showFilters = true,
  showPagination = true,
  page: controlledPage = 1,
  onPageChange,
  pageSize = 10,
  onPageSizeChange,
  total = 0,
  totalPages: providedTotalPages = 1,
  isLoading: externalIsLoading,
  statusCounts: externalStatusCounts,
  initialStatusHistoryMap,
  showAlarmIndicator = false,
}: CaseListProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // Force fresh data on mount
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["cases"] });
  }, []); // Empty dependency array to run only once on mount
  
  const [treatment, setTreatment] = useState<string>(initialTreatment || '');
  const [priority, setPriority] = useState<string>(initialPriority || '');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'default'>(initialSort || 'default');
  const [status, setStatus] = useState<string>(initialStatus || '');
  
  // Opdater state når props ændres (fra URL parametre i parent)
  useEffect(() => {
    if (initialTreatment !== undefined) setTreatment(initialTreatment);
  }, [initialTreatment]);
  
  useEffect(() => {
    if (initialPriority !== undefined) setPriority(initialPriority);
  }, [initialPriority]);
  
  useEffect(() => {
    if (initialSort !== undefined) setSort(initialSort);
  }, [initialSort]);
  
  useEffect(() => {
    if (initialStatus !== undefined) setStatus(initialStatus);
  }, [initialStatus]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [statusHistoryMap, setStatusHistoryMap] = useState<Record<number, StatusHistoryItem[]>>(initialStatusHistoryMap || {});

  // Debounce searchTerm to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Kun brug useCasesQuery hvis der ikke er sendt cases som props
  const shouldUseQuery = !providedCases;
  
  const { data, isLoading: queryLoading, isError, error, refetch } = useCasesQuery({
    page: controlledPage,
    pageSize,
    searchTerm: debouncedSearchTerm,
    treatment: treatment && treatment !== '' ? treatment : undefined,
    priority: priority && priority !== '' ? priority : undefined,
    sort: sort && sort !== 'default' ? sort : undefined,
    customerId,
    status: status && status !== '' && status !== 'all' ? status : undefined,
    isWorker: true,
    enabled: shouldUseQuery,
  });

  // Brug enten provided cases eller data fra query
  const displayedCases = Array.isArray(providedCases)
    ? providedCases
    : Array.isArray((data as any)?.items)
      ? (data as any).items
      : [];

  // Hent status-historik for alle sager
  useEffect(() => {
    if (!displayedCases || displayedCases.length === 0) return;
    
    const fetchStatusHistoryForCases = async () => {
      const historyMap: Record<number, StatusHistoryItem[]> = {};
      
      for (const caseItem of displayedCases) {
        try {
          const response = await fetch(`/api/cases/${caseItem.id}/status-history`, {
            credentials: 'include',
          });
          if (response.ok) {
            const history = await response.json();
            historyMap[caseItem.id] = history;
          }
        } catch (error) {
          console.error(`Error fetching status history for case ${caseItem.id}:`, error);
        }
      }
      
      setStatusHistoryMap(historyMap);
    };

    fetchStatusHistoryForCases();
  }, [displayedCases]);

  // Use displayed cases directly (no alarm filtering)
  const displayedCasesFiltered = displayedCases;

  // Debug logging
  console.log("CaseList render:", {
    controlledPage,
    onPageChange,
    data,
    totalPages: (data as any)?.totalPages
  });

  console.log("data", data);

  // Fjern den gamle baseCases definition da vi nu bruger displayedCases direkte
  const totalCases = Array.isArray(providedCases)
    ? providedCases.length
    : total || (data as any)?.total || 0;
  
  const effectiveTotalPages = Array.isArray(providedCases)
    ? Math.ceil(providedCases.length / pageSize)
    : (data as any)?.totalPages || providedTotalPages || 1;

  // Debug logging for pagination
  if (effectiveTotalPages <= 1) {
    console.log("Pagination NOT showing because effectiveTotalPages <= 1:", {
      showPagination,
      effectiveTotalPages,
      totalCases,
      providedTotalPages,
      dataFromQuery: (data as any)?.totalPages,
      dataTotal: (data as any)?.total,
      dataItems: (data as any)?.items?.length,
      providedCases: Array.isArray(providedCases),
      pageSize,
      controlledPage
    });
  }

  // Brug statusCounts fra props hvis givet, ellers beregn lokalt
  const effectiveStatusCounts = externalStatusCounts || statusCounts;

  useEffect(() => {
    if (!data || !(data as any).items || (data as any).items.length === 0) return;
    
    const fetchStatusHistoryForCases = async () => {
      const historyMap: Record<number, StatusHistoryItem[]> = {};
      
      for (const caseItem of (data as any).items) {
        try {
          const response = await fetch(`/api/cases/${caseItem.id}/status-history`, {
            credentials: 'include',
          });
          if (response.ok) {
            const history = await response.json();
            historyMap[caseItem.id] = history;
          }
        } catch (error) {
          console.error(`Error fetching status history for case ${caseItem.id}:`, error);
        }
      }
      
      setStatusHistoryMap(historyMap);
    };

    fetchStatusHistoryForCases();
  }, [data]);

  useEffect(() => {
    if (!externalStatusCounts) {
      // Beregn antal sager for hver status kun hvis ikke givet udefra
      const counts = displayedCases.reduce((acc: Record<string, number>, caseItem: CaseWithCustomer) => {
        acc[caseItem.status] = (acc[caseItem.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      setStatusCounts(counts);
    }
  }, [displayedCases, externalStatusCounts]);

  // Refetch query når filtre ændres for at tvinge re-fetch
  useEffect(() => {
    if (shouldUseQuery && refetch) {
      console.log("Filter changed, refetching data...", { treatment, priority, sort, status, debouncedSearchTerm });
      // Invalidate all cases queries to force fresh data
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      refetch();
    }
  }, [treatment, priority, sort, status, debouncedSearchTerm, shouldUseQuery, refetch, queryClient]);

  // Debug logning
  console.log("CaseList Debug:", {
    shouldUseQuery,
    displayedCasesCount: displayedCasesFiltered?.length,
    filterStates: { status, treatment, priority, sort },
    initialProps: { initialTreatment, initialPriority, initialSort, initialStatus },
    queryParams: {
      controlledPage,
      pageSize,
      searchTerm: debouncedSearchTerm,
      treatment: treatment && treatment !== '' ? treatment : undefined,
      priority: priority && priority !== '' ? priority : undefined,
      sort: sort && sort !== 'default' ? sort : undefined,
      customerId,
      status: status && status !== '' && status !== 'all' ? status : undefined,
    },
    queryData: data,
    queryLoading,
    isError,
    error: error?.message
  });

  const clearFilters = () => {
    setTreatment('');
    setPriority('');
    setSort('newest');
  };

  // Helper function to check if a case is in alarm state
  const isCaseAlarmed = (caseItem: CaseWithCustomer) => {
    return isCaseInAlarm(caseItem as any, []);
  };

  const getAlarmText = (caseItem: CaseWithCustomer) => {
    return getAlarmMessage(caseItem as any, []);
  };

  const handleTreatmentChange = (value: string) => {
    setTreatment(value);
    // Opdater URL params
    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set('treatment', value);
    } else {
      params.delete('treatment');
    }
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  };

  const handlePriorityChange = (value: string) => {
    setPriority(value);
    // Opdater URL params
    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set('priority', value);
    } else {
      params.delete('priority');
    }
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    // Opdater URL params
    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set('status', value);
    } else {
      params.delete('status');
    }
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  };

  const handleSortChange = (value: 'newest' | 'oldest' | 'default') => {
    setSort(value);
    // Opdater URL params
    const params = new URLSearchParams(window.location.search);
    if (value !== 'default') {
      params.set('sort', value);
    } else {
      params.delete('sort');
    }
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  };

  // Remove early returns and handle all states in the main component
  const renderContent = () => {
    if (externalIsLoading || queryLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    if (isError) {
      return (
        <div className="flex items-center justify-center p-8 text-red-500">
          <AlertCircle className="h-8 w-8 mr-2" />
          <span>Der opstod en fejl ved indlæsning af sager</span>
        </div>
      );
    }

    if (!Array.isArray(displayedCasesFiltered)) {
      return (
        <div className="flex items-center justify-center p-8 text-yellow-500">
          <AlertCircle className="h-8 w-8 mr-2" />
          <span>Ugyldig data format</span>
        </div>
      );
    }

    return (
      <>
        {showFilters && !isCustomerView && (
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={status ? "default" : "outline"}>
                    Status {status ? `: ${formatStatus(status)}` : ''} <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onClick={() => handleStatusChange('')}>
                    <span className="flex-1">Alle</span>
                    {!status && <Check className="ml-2 h-4 w-4" />}
                    <Badge variant="secondary" className="ml-2">{totalCases}</Badge>
                  </DropdownMenuItem>
                  {Object.entries(statuses).map(([key, label]) => (
                    <DropdownMenuItem key={key} onClick={() => handleStatusChange(key)}>
                      <span className="flex-1">{label}</span>
                      {status === key && <Check className="ml-2 h-4 w-4" />}
                      <Badge variant="secondary" className="ml-2">{effectiveStatusCounts[key] || 0}</Badge>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={treatment ? "default" : "outline"} className="gap-2">
                    Behandling {treatment ? `: ${formatTreatment(treatment)}` : ''}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleTreatmentChange('')}>
                    <span className="flex-1">Alle</span>
                    {!treatment && <Check className="ml-2 h-4 w-4" />}
                  </DropdownMenuItem>
                  {treatments.map((t) => (
                    <DropdownMenuItem
                      key={t.value}
                      onClick={() => handleTreatmentChange(t.value)}
                      className="gap-2"
                    >
                      {treatment === t.value && <Check className="h-4 w-4" />}
                      <span>{t.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={priority ? "default" : "outline"} className="gap-2">
                    Prioritet {priority ? `: ${formatPriority(priority)}` : ''}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handlePriorityChange('')}>
                    <span className="flex-1">Alle</span>
                    {!priority && <Check className="ml-2 h-4 w-4" />}
                  </DropdownMenuItem>
                  {priorities.map((p) => (
                    <DropdownMenuItem
                      key={p.value}
                      onClick={() => handlePriorityChange(p.value)}
                      className="gap-2"
                    >
                      {priority === p.value && <Check className="h-4 w-4" />}
                      <span>{p.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={sort && sort !== 'default' ? "default" : "outline"} className="gap-2">
                  Sortering {sort && sort !== 'default' ? `: ${sorts.find(s => s.value === sort)?.label}` : ''}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleSortChange('default')}>
                  <span className="flex-1">Standard</span>
                  {(!sort || sort === 'default') && <Check className="ml-2 h-4 w-4" />}
                </DropdownMenuItem>
                {sorts.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => handleSortChange(option.value as "newest" | "oldest" | "default")}
                    className="gap-2"
                  >
                    {sort === option.value && <Check className="h-4 w-4" />}
                    <span>{option.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <div className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sagsnr.</TableHead>
                    <TableHead>Kunde</TableHead>
                    <TableHead>Titel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Oprettet</TableHead>
                    {isWorker && <TableHead>Behandling</TableHead>}
                    {isWorker && <TableHead>Prioritet</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedCasesFiltered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isWorker ? 7 : 5} className="h-24 text-center text-gray-500">
                        Ingen sager fundet
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedCasesFiltered.map((case_) => {
                      const isAlarm = showAlarmIndicator && isCaseInAlarm(case_, statusHistoryMap[case_.id] || []);
                      
                      return (
                        <TableRow
                          key={case_.id}
                          className={`cursor-pointer hover:bg-muted/50 ${isAlarm ? 'border-red-500 bg-red-50' : ''}`}
                          onClick={() => {
                            if (isCustomerView) {
                              setLocation(`/case/${case_.id}`);
                            } else {
                              setLocation(`/worker/cases/${case_.id}`);
                            }
                          }}
                        >
                          <TableCell>{case_.caseNumber}</TableCell>
                          <TableCell>{case_.customerName}</TableCell>
                          <TableCell>{case_.title}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(case_.status)}>
                                {formatStatus(case_.status)}
                              </Badge>
                              {isAlarm && (
                                <div title={getAlarmText(case_)}>
                                  <Clock 
                                  className="h-4 w-4 text-red-500" 
                                  aria-label={getAlarmText(case_)}
                                />
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(case_.createdAt), "d. MMM yyyy", { locale: da })}
                          </TableCell>
                          {isWorker && (
                            <>
                              <TableCell>{formatTreatment(case_.treatment)}</TableCell>
                              <TableCell>{formatPriority(case_.priority)}</TableCell>
                            </>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {showPagination && effectiveTotalPages > 1 && (
            <div className="bg-white border rounded-lg shadow-sm">
              <div className="p-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Viser {Math.min((controlledPage - 1) * pageSize + 1, totalCases)} - {Math.min(controlledPage * pageSize, totalCases)} af {totalCases} sager
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange?.(1)}
                    disabled={controlledPage === 1}
                  >
                    Første
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange?.(controlledPage - 1)}
                    disabled={controlledPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Forrige
                  </Button>
                  
                  {/* Sidetal vælger */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, effectiveTotalPages) }, (_, i) => {
                      let pageNum;
                      if (effectiveTotalPages <= 5) {
                        pageNum = i + 1;
                      } else if (controlledPage <= 3) {
                        pageNum = i + 1;
                      } else if (controlledPage >= effectiveTotalPages - 2) {
                        pageNum = effectiveTotalPages - 4 + i;
                      } else {
                        pageNum = controlledPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === controlledPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => onPageChange?.(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    
                    {effectiveTotalPages > 5 && controlledPage < effectiveTotalPages - 2 && (
                      <>
                        <span className="px-2">...</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onPageChange?.(effectiveTotalPages)}
                          className="w-8 h-8 p-0"
                        >
                          {effectiveTotalPages}
                        </Button>
                      </>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange?.(controlledPage + 1)}
                    disabled={controlledPage === effectiveTotalPages}
                  >
                    Næste
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange?.(effectiveTotalPages)}
                    disabled={controlledPage === effectiveTotalPages}
                  >
                    Sidste
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <ErrorBoundary>
      <div className="space-y-4">
        {renderContent()}
      </div>
    </ErrorBoundary>
  );
}