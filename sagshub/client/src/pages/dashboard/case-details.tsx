import { Case, CaseWithCustomer } from "@shared/schema";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CaseForm } from "@/components/case-form";
import { ArrowLeft, Edit, Briefcase, X, Edit2, Printer } from "lucide-react";
import { useLocation } from "wouter";
import { MenuLayout } from "@/components/menu-layout";
import { useOrdersByCaseQuery } from "@/queries/orders";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InternalCaseForm } from "@/components/internal-case-form-copy";
import { CustomerView } from "@/components/customer-view";
import { isCaseInAlarm, getAlarmMessage } from '@shared/alarm';
import { PrintFollowupLayout } from "@/components/print-followup-layout";

interface CaseDetailsProps {
  params?: { id: string };
  id?: string;
  isCustomerView?: boolean;
}

interface StatusHistory {
  id: number;
  caseId: number;
  status: string;
  comment: string;
  createdAt: string;
  createdByName?: string;
}

const formatStatus = (status: string) => {
  const statuses = {
    'created': 'Oprettet',
    'in_progress': 'Påbegyndt',
    'offer_created': 'Tilbud oprettet',
    'waiting_customer': 'Afventer kunde',
    'offer_accepted': 'Tilbud godkendt',
    'offer_rejected': 'Tilbud afvist',
    'waiting_parts': 'Afventer dele',
    'preparing_delivery': 'Klargøring til levering',
    'ready_for_pickup': 'Afventer afhenting',
    'completed': 'Afsluttet'
  };
  return statuses[status as keyof typeof statuses] || status;
};

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
    'free_diagnosis': 'Gratis fejlsøgning',
    'four_days': 'Påbegyndt 4 hverdage',
    'first_priority': 'Første prioritering',
    'asap': 'Snarest muligt'
  };
  return priorities[priority as keyof typeof priorities] || priority;
};

const formatDeviceType = (deviceType: string) => {
  const devices = {
    'laptop': 'Bærbar',
    'pc': 'PC',
    'printer': 'Printer',
    'other': 'Andet'
  };
  return devices[deviceType as keyof typeof devices] || deviceType;
};

const nullableFields = ["importantNotes", "accessories", "loginInfo", "purchaseDate"];

const cleanData = (data: any) =>
  Object.fromEntries(
    Object.entries(data)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) =>
        nullableFields.includes(k) && v === "" ? [k, null] : [k, v]
      )
      .filter(([k, v]) =>
        nullableFields.includes(k) ? true : v !== "" && v !== null
      )
  );

export default function CaseDetails({ params, id, isCustomerView = false }: CaseDetailsProps) {
  const caseId = id || params?.id;
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [newStatus, setNewStatus] = useState<string>("");
  const [comment, setComment] = useState("");
  const [customerSheetOpen, setCustomerSheetOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [otherEmployee, setOtherEmployee] = useState("");

  const { data: case_, isLoading } = useQuery<CaseWithCustomer>({
    queryKey: ["/api/cases", caseId],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/cases/${caseId}`);
        if (!res.ok) {
          throw new Error("Kunne ikke hente sagen");
        }
        const data = await res.json();
        console.log("Fetched case data:", data);
        return data;
      } catch (error) {
        console.error("Error fetching case:", error);
        toast({
          title: "Fejl",
          description: "Der opstod en fejl ved hentning af sagen",
          variant: "destructive",
        });
        throw error;
      }
    },
    enabled: !!caseId,
  });

  const { data: statusHistory = [] } = useQuery<StatusHistory[]>({
    queryKey: ["/api/cases", caseId, "status-history"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/cases/${caseId}/status-history`);
      if (!res.ok) {
        throw new Error("Kunne ikke hente statushistorik");
      }
      return res.json();
    },
    enabled: !!caseId,
  });

  const { data: orders = [], isLoading: isLoadingOrders } = useOrdersByCaseQuery(
    parseInt(caseId || "0"),
    {
      enabled: !!caseId,
    }
  );

  const { data: fullCustomer } = useQuery({
    queryKey: ["/api/customers", case_?.customerId],
    queryFn: async () => {
      if (!case_?.customerId) return null;
      const res = await apiRequest("GET", `/api/customers/${case_.customerId}`);
      return res.json();
    },
    enabled: !!case_?.customerId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      if (!comment) {
        throw new Error("Kommentar er påkrævet ved statusændring");
      }
      const res = await apiRequest("POST", `/api/cases/${caseId}/status`, {
        status: newStatus,
        comment,
        updatedByName: otherEmployee.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "status-history"] });
      toast({
        title: "Status opdateret",
        description: "Sagens status er blevet opdateret",
      });
      setNewStatus("");
      setComment("");
      setOtherEmployee("");
    },
    onError: (error: Error) => {
      toast({
        title: "Fejl",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCaseMutation = useMutation({
    mutationFn: async (data: Partial<Case>) => {
      if (!case_?.id) {
        throw new Error("Kunne ikke finde sags-ID");
      }
      const cleaned = cleanData(data);
      const res = await apiRequest("PATCH", `/api/cases/${case_.id}`, cleaned);
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Der opstod en fejl ved opdatering af sagen");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases", params.id] });
      toast({
        title: "Succes",
        description: "Sagen er blevet opdateret",
      });
    },
    onError: (error: Error) => {
      console.error("Error updating case:", error);
      toast({
        title: "Fejl ved opdatering",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onInternalCaseSent = () => {
    toast({
      title: "Intern sag sendt",
      description: "Din besked er blevet sendt til medarbejderen",
    });
  };

  if (isLoading || !case_) {
    return (
      <div className={isCustomerView ? "min-h-screen bg-gray-50" : ""}>
        {isCustomerView ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-lg text-gray-600">Indlæser sag...</p>
            </div>
          </div>
        ) : (
          <MenuLayout>
            <div className="p-6">
              <div>Indlæser...</div>
            </div>
          </MenuLayout>
        )}
      </div>
    );
  }

  if (isCustomerView) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div>
                <Button variant="ghost" onClick={() => setLocation("/")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Tilbage til oversigt
                </Button>
                <h1 className="text-2xl font-bold text-gray-900 mt-2">Sag #{case_.caseNumber}</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Detaljer</h2>
            
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                <dd className="text-sm">{formatStatus(case_.status)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Oprettet</dt>
                <dd className="text-sm">
                  {format(new Date(case_.createdAt), "d. MMM yyyy", { locale: da })}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Behandling</dt>
                <dd className="text-sm">{formatTreatment(case_.treatment)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Prioritering</dt>
                <dd className="text-sm">{formatPriority(case_.priority)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Enhed</dt>
                <dd className="text-sm">{formatDeviceType(case_.deviceType)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">Beskrivelse</dt>
                <dd className="text-sm whitespace-pre-wrap">{case_.description}</dd>
              </div>
              {case_.accessories && (
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">Tilbehør</dt>
                  <dd className="text-sm whitespace-pre-wrap">{case_.accessories}</dd>
                </div>
              )}
              {case_.importantNotes && (
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">Vigtige bemærkninger</dt>
                  <dd className="text-sm whitespace-pre-wrap">{case_.importantNotes}</dd>
                </div>
              )}
              <div className="col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">Kode, Logininfo og Pinkode</dt>
                {case_.status === 'completed' ? (
                  <dd className="text-sm text-gray-400 bg-gray-100 p-2 rounded border">
                    [Slettet af sikkerhedshensyn - sag afsluttet]
                  </dd>
                ) : case_.loginInfo ? (
                  <dd className="text-sm whitespace-pre-wrap bg-yellow-50 p-2 rounded border">
                    {case_.loginInfo}
                    <div className="text-xs text-muted-foreground mt-1">
                      ⚠️ Denne information slettes automatisk når sagen afsluttes
                    </div>
                  </dd>
                ) : (
                  <dd className="text-sm text-gray-500 bg-gray-50 p-2 rounded border">
                    Ingen loginoplysninger angivet
                  </dd>
                )}
              </div>
              <div className="col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">Købsoplysninger</dt>
                <dd className="text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    {case_.purchasedHere ? (
                      <>
                        <span className="text-green-600">✓</span>
                        <span>Produktet er købt her</span>
                      </>
                    ) : (
                      <>
                        <span className="text-gray-400">✗</span>
                        <span className="text-gray-500">Produktet er ikke købt her</span>
                      </>
                    )}
                  </div>
                  <div>
                    <span className="font-medium">Købsdato: </span>
                    {case_.purchaseDate ? (
                      format(new Date(case_.purchaseDate), "d. MMM yyyy", { locale: da })
                    ) : (
                      <span className="text-gray-500">Ikke angivet</span>
                    )}
                  </div>
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Status historik</h2>
            <div className="space-y-4">
              {statusHistory.map((history) => (
                <div
                  key={history.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{formatStatus(history.status)}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(history.createdAt), "d. MMM yyyy HH:mm", { locale: da })}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{history.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MenuLayout>
      <div className="p-6">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => setLocation("/worker/cases")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbage til sager
          </Button>
          <h1 className="text-2xl font-bold">Sag #{case_.caseNumber}</h1>
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold">Detaljer</h2>
              {user?.isWorker && (
                <div className="flex gap-2">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Rediger
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>Rediger sag #{case_.caseNumber}</SheetTitle>
                      </SheetHeader>
                      <div className="mt-6">
                        <CaseForm
                          defaultValues={case_}
                          onSubmit={updateCaseMutation.mutate}
                          isLoading={updateCaseMutation.isPending}
                        />
                      </div>
                    </SheetContent>
                  </Sheet>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        <Briefcase className="h-4 w-4 mr-2" />
                        Intern sag
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Send sag til kollega</DialogTitle>
                        <DialogDescription>
                          Send denne sag til en anden medarbejder med en besked
                        </DialogDescription>
                      </DialogHeader>
                      <InternalCaseForm caseId={parseInt(caseId || "0")} onSuccess={onInternalCaseSent} />
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" size="sm" onClick={() => {
                    const printWindow = window.open('', '_blank', 'width=900,height=1200');
                    if (!printWindow) return;
                    printWindow.document.write('<html><head><title>Følgeseddel</title>');
                    printWindow.document.write('<link rel="stylesheet" href="/src/index.css" />');
                    printWindow.document.write('</head><body>');
                    printWindow.document.write('<div id="print-root"></div>');
                    printWindow.document.write('</body></html>');
                    printWindow.document.close();
                    setTimeout(() => {
                      printWindow.document.getElementById('print-root').innerHTML =
                        document.getElementById('print-root-prototype').innerHTML;
                      printWindow.print();
                    }, 500);
                  }} title="Print følgeseddel">
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="bg-muted p-4 rounded-lg mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Kunde</dt>
                  <dd className="text-base mt-1">
                    <button 
                      className="text-primary hover:underline font-medium flex items-center"
                      onClick={() => setSelectedCustomer(fullCustomer)}
                    >
                      {case_.customer?.name}
                    </button>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Telefonnummer</dt>
                  <dd className="text-base mt-1">{case_.customer?.phone || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                  <dd className="text-base mt-1">{case_.customer?.email || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Adresse</dt>
                  <dd className="text-base mt-1">{case_.customer?.address || '-'}</dd>
                </div>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                <dd className="text-sm">{formatStatus(case_.status)}</dd>
              </div>
              {isCaseInAlarm(case_, statusHistory) && (
                <div>
                  <dt className="text-sm font-medium text-red-700 flex items-center gap-1">
                    <span style={{display: 'inline-block', verticalAlign: 'middle'}}>🔔</span> Alarm
                  </dt>
                  <dd className="text-sm text-red-700">{getAlarmMessage(case_, statusHistory)}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Oprettet</dt>
                <dd className="text-sm">
                  {format(new Date(case_.createdAt), "d. MMM yyyy", { locale: da })}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Behandling</dt>
                <dd className="text-sm">{formatTreatment(case_.treatment)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Prioritering</dt>
                <dd className="text-sm">{formatPriority(case_.priority)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Enhed</dt>
                <dd className="text-sm">{formatDeviceType(case_.deviceType)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">Beskrivelse</dt>
                <dd className="text-sm whitespace-pre-wrap">{case_.description}</dd>
              </div>
              {case_.accessories && (
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">Tilbehør</dt>
                  <dd className="text-sm whitespace-pre-wrap">{case_.accessories}</dd>
                </div>
              )}
              {case_.importantNotes && (
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">Vigtige bemærkninger</dt>
                  <dd className="text-sm whitespace-pre-wrap">{case_.importantNotes}</dd>
                </div>
              )}
              <div className="col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">Kode, Logininfo og Pinkode</dt>
                {case_.status === 'completed' ? (
                  <dd className="text-sm text-gray-400 bg-gray-100 p-2 rounded border">
                    [Slettet af sikkerhedshensyn - sag afsluttet]
                  </dd>
                ) : case_.loginInfo ? (
                  <dd className="text-sm whitespace-pre-wrap bg-yellow-50 p-2 rounded border">
                    {case_.loginInfo}
                    <div className="text-xs text-muted-foreground mt-1">
                      ⚠️ Denne information slettes automatisk når sagen afsluttes
                    </div>
                  </dd>
                ) : (
                  <dd className="text-sm text-gray-500 bg-gray-50 p-2 rounded border">
                    Ingen loginoplysninger angivet
                  </dd>
                )}
              </div>
              <div className="col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">Købsoplysninger</dt>
                <dd className="text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    {case_.purchasedHere ? (
                      <>
                        <span className="text-green-600">✓</span>
                        <span>Produktet er købt her</span>
                      </>
                    ) : (
                      <>
                        <span className="text-gray-400">✗</span>
                        <span className="text-gray-500">Produktet er ikke købt her</span>
                      </>
                    )}
                  </div>
                  <div>
                    <span className="font-medium">Købsdato: </span>
                    {case_.purchaseDate ? (
                      format(new Date(case_.purchaseDate), "d. MMM yyyy", { locale: da })
                    ) : (
                      <span className="text-gray-500">Ikke angivet</span>
                    )}
                  </div>
                </dd>
              </div>
            </dl>
          </div>

          {user?.isWorker && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Opdater status</h2>
              <div className="space-y-4">
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vælg ny status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">Påbegyndt</SelectItem>
                    <SelectItem value="offer_created">Tilbud oprettet</SelectItem>
                    <SelectItem value="waiting_customer">Afventer kunde</SelectItem>
                    <SelectItem value="offer_accepted">Tilbud godkendt</SelectItem>
                    <SelectItem value="offer_rejected">Tilbud afvist</SelectItem>
                    <SelectItem value="waiting_parts">Afventer dele</SelectItem>
                    <SelectItem value="preparing_delivery">Klargøring til levering</SelectItem>
                    <SelectItem value="ready_for_pickup">Afventer afhenting</SelectItem>
                    <SelectItem value="completed">Afsluttet</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Tilføj kommentar (påkrævet)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="Medarbejder (valgfrit)"
                  value={otherEmployee}
                  onChange={e => setOtherEmployee(e.target.value)}
                />
                <Button
                  className="w-full"
                  disabled={!newStatus || !comment || updateStatusMutation.isPending}
                  onClick={() => updateStatusMutation.mutate()}
                >
                  {updateStatusMutation.isPending ? "Opdaterer..." : "Opdater status"}
                </Button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Historik</h2>
            <div className="space-y-4">
              {statusHistory.map((history) => (
                <div
                  key={history.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{formatStatus(history.status)}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(history.createdAt), "d. MMM yyyy HH:mm", { locale: da })}
                        <br />
                        Opdateret af: {history.createdByName || 'System'}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{history.comment}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Bestillinger</h2>
            {isLoadingOrders ? (
              <div className="text-center py-4">Indlæser bestillinger...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Ingen bestillinger knyttet til denne sag
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <p className="font-medium">Bestilling #{order.orderNumber}</p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {order.orderDate
                            ? format(new Date(order.orderDate), "d. MMM yyyy", { locale: da })
                            : "Ingen bestillingsdato"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getOrderStatusBadge(order.status)}
                        <Button 
                          variant="link" 
                          className="h-auto p-0" 
                          onClick={() => setLocation(`/worker/orders/${order.id}`)}
                        >
                          Se detaljer
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm font-medium">Bestilt:</p>
                      <p className="text-sm whitespace-pre-wrap">{order.itemsOrdered || "-"}</p>
                    </div>
                    {order.supplier && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">Leverandør:</p>
                        <p className="text-sm">{order.supplier}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedCustomer && (
        <CustomerView
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}

      {/* Usynlig prototype til print, så vi kan kopiere layoutet til print-vinduet */}
      <div id="print-root-prototype" style={{display: 'none'}}>
        <PrintFollowupLayout caseData={{...case_, statusHistory}} />
      </div>
    </MenuLayout>
  );
}

function getOrderStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="outline">Afventer</Badge>;
    case "ordered":
      return <Badge variant="default">Bestilt</Badge>;
    case "shipped":
      return <Badge variant="secondary">Afsendt</Badge>;
    case "delivered":
      return <Badge variant="success">Leveret</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Annulleret</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}