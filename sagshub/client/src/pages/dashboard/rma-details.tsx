import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MenuLayout } from "@/components/menu-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { RMAStatus } from "@shared/schema";
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import { useState } from "react";
import { CustomerView } from "@/components/customer-view";
import { RMAForm } from "@/components/rma-form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type RMA = {
  id: number;
  rmaNumber: string;
  customerName: string;
  customerId: number | null;
  invoiceNumber: string | null;
  faultDate: string;
  faultDescription: string;
  modelName: string;
  sku: string | null;
  serialNumber: string | null;
  supplier: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

const statusTranslations = {
  [RMAStatus.CREATED]: 'Oprettet',
  [RMAStatus.IN_PROGRESS]: 'Under behandling',
  [RMAStatus.WAITING_SUPPLIER]: 'Afventer leverandør',
  [RMAStatus.READY_FOR_RETURN]: 'Klar til returnering',
  [RMAStatus.COMPLETED]: 'Afsluttet',
  [RMAStatus.REJECTED]: 'Afvist'
} as const;

export default function RMADetails() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [statusComment, setStatusComment] = useState("");
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { data: rma, isLoading } = useQuery<RMA>({
    queryKey: ["/api/rma", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/rma/${id}`);
      return res.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (data: { status: string; comment: string }) => {
      const res = await apiRequest("PATCH", `/api/rma/${id}/status`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rma", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/rma"] });
      toast({
        title: "Status opdateret",
        description: "RMA sagens status er blevet opdateret",
      });
      setIsStatusDialogOpen(false);
      setSelectedStatus("");
      setStatusComment("");
    },
    onError: (error: Error) => {
      toast({
        title: "Fejl",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRMAMutation = useMutation({
    mutationFn: async (data: Partial<RMA>) => {
      const res = await apiRequest("PATCH", `/api/rma/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rma", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/rma"] });
      toast({
        title: "RMA opdateret",
        description: "RMA sagen er blevet opdateret",
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fejl",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch status history
  const { data: statusHistory = [] } = useQuery({
    queryKey: ["/api/rma", id, "status-history"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/rma/${id}/status-history`);
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <MenuLayout>
        <div className="p-6">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MenuLayout>
    );
  }

  if (!rma) {
    return (
      <MenuLayout>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">RMA ikke fundet</h1>
          <Button onClick={() => navigate("/worker/rma")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbage til RMA oversigt
          </Button>
        </div>
      </MenuLayout>
    );
  }

  const handleUpdate = (data: any) => {
    // Konverter faultDate til ISO string hvis det er en Date
    if (data.faultDate instanceof Date) {
      data.faultDate = data.faultDate.toISOString();
    }
    updateRMAMutation.mutate(data);
  };

  return (
    <MenuLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Button
              variant="outline"
              onClick={() => navigate("/worker/rma")}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tilbage til RMA oversigt
            </Button>
            <h1 className="text-2xl font-bold">RMA Detaljer - {rma.rmaNumber}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit2 className="mr-2 h-4 w-4" />
              Rediger
            </Button>
            <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
              <DialogTrigger asChild>
                <Button>Opdater Status</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Opdater RMA Status</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={selectedStatus}
                      onValueChange={setSelectedStatus}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Vælg ny status" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusTranslations).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Kommentar</Label>
                    <Textarea
                      value={statusComment}
                      onChange={(e) => setStatusComment(e.target.value)}
                      placeholder="Tilføj en kommentar..."
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (selectedStatus && statusComment) {
                        updateStatusMutation.mutate({
                          status: selectedStatus,
                          comment: statusComment,
                        });
                      }
                    }}
                    disabled={!selectedStatus || !statusComment}
                  >
                    Gem Status
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Kundeoplysninger</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div>
                  <dt className="font-medium">Kundenavn</dt>
                  <dd>
                    {rma.customerId ? (
                      <button
                        className="text-primary hover:underline"
                        onClick={() => setSelectedCustomer({
                          id: rma.customerId,
                          name: rma.customerName
                        })}
                      >
                        {rma.customerName}
                      </button>
                    ) : (
                      rma.customerName
                    )}
                  </dd>
                </div>
                {rma.customerId && (
                  <div>
                    <dt className="font-medium">Kunde ID</dt>
                    <dd>{rma.customerId}</dd>
                  </div>
                )}
                {rma.invoiceNumber && (
                  <div>
                    <dt className="font-medium">Fakturanummer</dt>
                    <dd>{rma.invoiceNumber}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Produkt Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div>
                  <dt className="font-medium">Model</dt>
                  <dd>{rma.modelName}</dd>
                </div>
                {rma.serialNumber && (
                  <div>
                    <dt className="font-medium">Serienummer</dt>
                    <dd>{rma.serialNumber}</dd>
                  </div>
                )}
                {rma.sku && (
                  <div>
                    <dt className="font-medium">SKU</dt>
                    <dd>{rma.sku}</dd>
                  </div>
                )}
                {rma.supplier && (
                  <div>
                    <dt className="font-medium">Leverandør</dt>
                    <dd>{rma.supplier}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Fejlbeskrivelse</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{rma.faultDescription}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Fejlmeldt: {(() => {
                  if (!rma.faultDate) return 'Dato ikke angivet';
                  try {
                    return format(new Date(rma.faultDate), "d. MMMM yyyy", { locale: da });
                  } catch {
                    return 'Ugyldig dato';
                  }
                })()}
              </p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Historik</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statusHistory.map((record: any) => (
                  <div key={record.id} className="border-b pb-2">
                    <p className="font-medium">
                      {statusTranslations[record.status as keyof typeof statusTranslations]}
                    </p>
                    <p>{record.comment}</p>
                    <p className="text-sm text-muted-foreground">
                      {(() => {
                        try {
                          return format(new Date(record.createdAt), "d. MMMM yyyy HH:mm", { locale: da });
                        } catch {
                          return 'Ugyldig dato';
                        }
                      })()} - {record.createdBy}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedCustomer && (
        <CustomerView
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}

      <Sheet open={isEditing} onOpenChange={setIsEditing}>
        <SheetContent side="right" className="w-[800px] sm:w-[540px] overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Rediger RMA</SheetTitle>
          </SheetHeader>
          {rma && (
            <RMAForm
              onSubmit={handleUpdate}
              isLoading={updateRMAMutation.isPending}
              defaultValues={{
                ...rma,
                faultDate: rma.faultDate ? new Date(rma.faultDate) : new Date()
              }}
              isEditing={true}
            />
          )}
        </SheetContent>
      </Sheet>
    </MenuLayout>
  );
}