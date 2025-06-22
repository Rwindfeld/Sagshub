import { Case, CaseStatus, StatusHistory } from "@shared/schema";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
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
import { X } from "lucide-react";

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

  // Hent statushistorik
  const { data: statusHistory } = useQuery<StatusHistory[]>({
    queryKey: ["/api/cases", case_.id, "status-history"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/cases/${case_.id}/status-history`);
      return res.json();
    },
  });

  // Mutation til at opdatere status
  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      if (!comment) {
        throw new Error("Kommentar er påkrævet ved statusændring");
      }
      const res = await apiRequest("POST", `/api/cases/${case_.id}/status`, {
        status: newStatus,
        comment,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases", case_.id, "status-history"] });
      toast({
        title: "Status opdateret",
        description: "Sagens status er blevet opdateret",
      });
      setNewStatus("");
      setComment("");
    },
    onError: (error: Error) => {
      toast({
        title: "Fejl",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Sheet open={true} onOpenChange={() => onClose()}>
      <SheetContent side="right" className="w-[600px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="space-y-2">
          <div className="flex justify-between items-center">
            <SheetTitle>Sag #{case_.caseNumber}</SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
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
              {user?.isWorker && case_.importantNotes && (
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">Vigtige bemærkninger</dt>
                  <dd className="text-sm whitespace-pre-wrap">{case_.importantNotes}</dd>
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

          {/* Statushistorik */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Historik</h3>
            <div className="space-y-4">
              {statusHistory?.map((history) => (
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
      </SheetContent>
    </Sheet>
  );
}