import { Case, CaseStatus, StatusHistory } from "@shared/schema";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, AlertCircle, Loader2, Printer } from "lucide-react";
import { isCaseInAlarm, getAlarmMessage } from "@/utils/dates";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { PrintFollowupDialog } from "./print-followup-dialog";
import { PrintFollowupLayout } from "./print-followup-layout";

interface CaseDetailsProps {
  case_: Case;
  onClose: () => void;
}

// Formatters for display values (genbrug fra case-list.tsx)
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

export function CaseDetails({ case_, onClose }: CaseDetailsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [newStatus, setNewStatus] = useState<string>("");
  const [comment, setComment] = useState("");
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [otherEmployee, setOtherEmployee] = useState("");

  // Hent statushistorik med loading state
  const { 
    data: statusHistory, 
    isLoading: isLoadingHistory,
    isError: isHistoryError,
    error: historyError
  } = useQuery<StatusHistory[]>({
    queryKey: ["/api/cases", case_.id, "status-history"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/cases/${case_.id}/status-history`);
      const data = await res.json();
      return data;
    },
  });

  // Tjek om sagen er i alarm
  const isInAlarm = statusHistory ? isCaseInAlarm(case_, statusHistory) : false;
  const alarmMessage = isInAlarm ? getAlarmMessage(case_, statusHistory || []) : null;

  // Mutation til at opdatere status med loading state
  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      if (!comment) {
        throw new Error("Kommentar er påkrævet ved statusændring");
      }
      const res = await apiRequest("POST", `/api/cases/${case_.id}/status`, {
        status: newStatus,
        comment: comment,
        updatedByName: otherEmployee.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      // Invalidér ALLE cases queries (inklusiv statistik-siden)
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases", case_.id, "status-history"] });
      // Invalidér ALT der starter med /api/cases for at være sikker
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          return typeof query.queryKey[0] === 'string' && 
                 query.queryKey[0].startsWith('/api/cases');
        }
      });
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

  // Print-funktion: Åbn nyt vindue med layout og print
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) return;
    printWindow.document.write('<html><head><title>Følgeseddel</title>');
    printWindow.document.write('</head><body style="margin:0;padding:0;">');
    printWindow.document.write('<div id="print-root"></div>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    // Vent til vinduet er klar, så render React layout
    printWindow.onload = () => {
      // @ts-ignore
      import('react-dom/client').then(({ createRoot }) => {
        const root = createRoot(printWindow.document.getElementById('print-root'));
        root.render(
          <PrintFollowupLayout caseData={case_ as any} onPrint={() => printWindow.print()} />
        );
      });
    };
  };

  return (
    <Sheet open={true} onOpenChange={() => onClose()}>
      <SheetContent side="right" className="w-[600px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="space-y-2">
          <div className="flex justify-between items-center">
            <SheetTitle>Sag #{case_.caseNumber}</SheetTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => setIsPrintDialogOpen(true)} title="Print følgeseddel">
                <Printer className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Alarm klokke og besked */}
          {isInAlarm && alarmMessage && (
            <Alert variant="destructive" className="border-red-600 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <AlertTitle>Sag i alarm</AlertTitle>
                <AlertDescription>{alarmMessage}</AlertDescription>
              </div>
            </Alert>
          )}

          {/* Sagens detaljer */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Detaljer</h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Kunde</dt>
                <dd className="text-sm">{case_.customerName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                <dd className="text-sm">{formatStatus(case_.status)}</dd>
              </div>
              {isInAlarm && alarmMessage && (
                <div>
                  <dt className="text-sm font-medium text-red-700 flex items-center gap-1">
                    <AlertCircle className="inline h-4 w-4 text-red-500" /> Alarm
                  </dt>
                  <dd className="text-sm text-red-700">{alarmMessage}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Oprettet</dt>
                <dd className="text-sm">
                  {format(new Date(case_.createdAt), "d. MMM yyyy", { locale: da })}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Oprettet af</dt>
                <dd className="text-sm">{case_.createdBy || 'System'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Behandling</dt>
                <dd className="text-sm">{case_.treatment}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Prioritering</dt>
                <dd className="text-sm">{case_.priority}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Enhed</dt>
                <dd className="text-sm">{case_.deviceType}</dd>
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
              
              {/* Login Information - kun vis hvis der er data */}
              {case_.loginInfo && (
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    Kode, Logininfo og Pinkode
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      Slettes ved afslutning
                    </span>
                  </dt>
                  <dd className="text-sm whitespace-pre-wrap bg-yellow-50 p-2 rounded border">
                    {case_.loginInfo}
                  </dd>
                </div>
              )}
              
              {/* Purchase Information */}
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Købt her</dt>
                <dd className="text-sm">
                  {case_.purchasedHere ? (
                    <span className="text-green-600 font-medium">✓ Ja</span>
                  ) : (
                    <span className="text-gray-500">✗ Nej</span>
                  )}
                </dd>
              </div>
              
              {case_.purchaseDate && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Købsdato</dt>
                  <dd className="text-sm">
                    {format(new Date(case_.purchaseDate), "d. MMM yyyy", { locale: da })}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Status opdatering */}
          {user?.isWorker && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Opdater status</h3>
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
                  {updateStatusMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Opdaterer...
                    </>
                  ) : (
                    "Opdater status"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Statushistorik */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Historik</h3>
            <div className="space-y-4">
              {isLoadingHistory ? (
                // Loading state
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))
              ) : isHistoryError ? (
                // Error state
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Fejl</AlertTitle>
                  <AlertDescription>
                    {historyError instanceof Error ? historyError.message : 'Der opstod en fejl ved hentning af historik'}
                  </AlertDescription>
                </Alert>
              ) : statusHistory?.length === 0 ? (
                // Empty state
                <div className="text-center text-muted-foreground py-4">
                  Ingen statushistorik tilgængelig
                </div>
              ) : (
                // Success state
                statusHistory?.map((history) => (
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
                        <p className="text-sm text-muted-foreground">
                          Opdateret af: {history.createdByName || history.createdBy}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{history.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <PrintFollowupDialog
          isOpen={isPrintDialogOpen}
          onClose={() => setIsPrintDialogOpen(false)}
          onPrint={() => {
            setIsPrintDialogOpen(false);
            handlePrint();
          }}
          onSkip={() => setIsPrintDialogOpen(false)}
          caseData={case_ as any}
        />
      </SheetContent>
    </Sheet>
  );
}