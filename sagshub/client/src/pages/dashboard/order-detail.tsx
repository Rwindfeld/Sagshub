import { useParams, useLocation } from "wouter";
import { MenuLayout } from "@/components/menu-layout";
import { useOrderQuery, useUpdateOrderMutation, useUpdateOrderStatusMutation } from "@/queries/orders";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Edit, Clock } from "lucide-react";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { OrderStatus } from "@shared/schema";
import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose 
} from "@/components/ui/dialog";
import { OrderForm } from "@/components/order-form";
import { CustomerDetailsModal } from "@/components/CustomerDetailsModal";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const { data: order, isLoading, isError, error } = useOrderQuery(
    parseInt(id || "0"),
    {
      enabled: !!id && !isNaN(parseInt(id)),
    }
  );

  const { mutate: updateOrderStatus } = useUpdateOrderStatusMutation();

  const handleStatusChange = (status: string) => {
    if (!id) return;
    
    setIsUpdatingStatus(true);
    updateOrderStatus(
      {
        id: parseInt(id),
        status,
      },
      {
        onSuccess: () => {
          toast({
            title: "Status opdateret",
            description: "Bestillingens status er blevet opdateret",
          });
          setIsUpdatingStatus(false);
        },
        onError: (error) => {
          toast({
            title: "Fejl ved opdatering af status",
            description: error.message || "Der skete en fejl ved opdatering af status",
            variant: "destructive",
          });
          setIsUpdatingStatus(false);
        },
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case OrderStatus.PENDING:
        return <Badge variant="outline">Afventer</Badge>;
      case OrderStatus.ORDERED:
        return <Badge variant="default">Bestilt</Badge>;
      case OrderStatus.SHIPPED:
        return <Badge variant="secondary">Afsendt</Badge>;
      case OrderStatus.DELIVERED:
        return <Badge variant="success">Leveret</Badge>;
      case OrderStatus.CANCELLED:
        return <Badge variant="destructive">Annulleret</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleUpdateSuccess = () => {
    toast({
      title: "Bestilling opdateret",
      description: "Bestillingen er blevet opdateret",
    });
  };

  if (isLoading) {
    return (
      <MenuLayout>
        <div className="container mx-auto py-1">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </MenuLayout>
    );
  }

  if (isError || !order) {
    return (
      <MenuLayout>
        <div className="container mx-auto py-1">
          <div className="flex justify-between items-center mb-6">
            <Button variant="ghost" onClick={() => setLocation("/worker/orders")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tilbage til bestillinger
            </Button>
          </div>
          <div className="p-6 text-center">
            <p className="text-red-500">
              En fejl opstod: {error?.message || "Kunne ikke hente bestillingsdetaljer"}
            </p>
          </div>
        </div>
      </MenuLayout>
    );
  }

  return (
    <MenuLayout>
      <div className="container mx-auto py-1">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Button variant="ghost" onClick={() => setLocation("/worker/orders")} className="mr-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tilbage
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Bestilling #{order.orderNumber}
              </h1>
              <div className="flex items-center text-sm text-muted-foreground mt-1">
                <Clock className="mr-1 h-3 w-3" />
                Oprettet{" "}
                {format(new Date(order.createdAt), "d. MMMM yyyy", {
                  locale: da,
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center mr-4">
              <span className="text-sm mr-2">Status:</span>
              {isUpdatingStatus ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                getStatusBadge(order.status)
              )}
            </div>

            <Select
              value={order.status}
              onValueChange={handleStatusChange}
              disabled={isUpdatingStatus}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Skift status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OrderStatus.PENDING}>Afventer</SelectItem>
                <SelectItem value={OrderStatus.ORDERED}>Bestilt</SelectItem>
                <SelectItem value={OrderStatus.SHIPPED}>Afsendt</SelectItem>
                <SelectItem value={OrderStatus.DELIVERED}>Leveret</SelectItem>
                <SelectItem value={OrderStatus.CANCELLED}>Annulleret</SelectItem>
              </SelectContent>
            </Select>

            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Edit className="mr-2 h-4 w-4" />
                  Rediger
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Rediger bestilling #{order.orderNumber}</DialogTitle>
                </DialogHeader>
                <OrderForm onSuccess={handleUpdateSuccess} orderId={order.id} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Bestillingsdetaljer</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Bestillingsdato</h4>
                  <p>
                    {order.orderDate
                      ? format(new Date(order.orderDate), "d. MMMM yyyy", {
                          locale: da,
                        })
                      : "-"}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Bestilt af</h4>
                  <p>{order.createdByUser?.name || "-"}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Bestilt</h4>
                <p className="whitespace-pre-line">{order.itemsOrdered}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Leverandør</h4>
                  <p>{order.supplier}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Pris</h4>
                  <p>{order.price || "-"}</p>
                </div>
              </div>

              {(order.model || order.serialNumber || order.faultDescription) && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2">Produktinformation</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {order.model && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Model</h4>
                          <p>{order.model}</p>
                        </div>
                      )}
                      {order.serialNumber && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Serienummer</h4>
                          <p>{order.serialNumber}</p>
                        </div>
                      )}
                    </div>
                    {order.faultDescription && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Fejlbeskrivelse</h4>
                        <p className="whitespace-pre-line">{order.faultDescription}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Kundeinfo</CardTitle>
              </CardHeader>
              <CardContent>
                <button
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="text-left hover:text-primary transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{order.customer.name}</p>
                    <p className="text-sm text-muted-foreground">{order.customer.email}</p>
                    <p className="text-sm text-muted-foreground">{order.customer.phone}</p>
                </div>
                </button>
              </CardContent>
            </Card>

            {(order.caseId || order.rmaId) && (
              <Card>
                <CardHeader>
                  <CardTitle>Relaterede sager</CardTitle>
                </CardHeader>
                <CardContent>
                  {order.caseId && order.case && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Sag</h4>
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => setLocation(`/worker/cases/${order.caseId}`)}
                      >
                        #{order.case.caseNumber} - {order.case.description.substring(0, 30)}
                        {order.case.description.length > 30 ? "..." : ""}
                      </Button>
                    </div>
                  )}

                  {order.rmaId && order.rmaCase && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">RMA</h4>
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => setLocation(`/worker/rma/${order.rmaId}`)}
                      >
                        #{order.rmaCase.rmaNumber} - {order.rmaCase.description.substring(0, 30)}
                        {order.rmaCase.description.length > 30 ? "..." : ""}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <CustomerDetailsModal
          customer={order.customer}
          isOpen={isCustomerModalOpen}
          onClose={() => setIsCustomerModalOpen(false)}
        />
      </div>
    </MenuLayout>
  );
} 