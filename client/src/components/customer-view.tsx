import { useState, useEffect } from "react";
import { Customer, Case } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CustomerForm } from "./customer-form";
import { Button } from "@/components/ui/button";
import { CaseList } from "@/components/case-list";
import { useToast } from "@/hooks/use-toast";
import { Edit2, Save, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { RMAStatus } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface CustomerViewProps {
  customer: Customer;
  onClose: () => void;
}

function formatCustomerId(id: number | undefined): string {
  if (!id) return '0000';
  return id.toString().padStart(4, '0');
}

// Status oversættelser
const statusTranslations = {
  [RMAStatus.CREATED]: 'Oprettet',
  [RMAStatus.SENT_TO_SUPPLIER]: 'Sendt til leverandør',
  [RMAStatus.WAITING_SUPPLIER]: 'Afventer leverandør',
  [RMAStatus.RECEIVED_FROM_SUPPLIER]: 'Modtaget fra leverandør',
  [RMAStatus.READY_FOR_PICKUP]: 'Klar til afhentning',
  [RMAStatus.COMPLETED]: 'Afsluttet',
  [RMAStatus.REJECTED]: 'Afvist'
} as const;

// Status farver
const statusColors: Record<string, string> = {
  'Oprettet': 'bg-gray-500',
  'Sendt til leverandør': 'bg-orange-500',
  'Afventer leverandør': 'bg-yellow-500',
  'Modtaget fra leverandør': 'bg-purple-500',
  'Klar til afhentning': 'bg-blue-500',
  'Afsluttet': 'bg-green-700',
  'Afvist': 'bg-red-700'
};

export function CustomerView({ customer: initialCustomer, onClose }: CustomerViewProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    email: initialCustomer.email || '',
    address: initialCustomer.address || '',
    city: initialCustomer.city || '',
    postalCode: initialCustomer.postalCode || '',
    notes: initialCustomer.notes || ''
  });
  const [, setLocation] = useLocation();

  // Hent fresh customer data
  const { data: freshCustomer, isLoading: customerLoading } = useQuery<Customer>({
    queryKey: ["customer", initialCustomer.id],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${initialCustomer.id}`);
      if (!res.ok) {
        throw new Error("Kunne ikke hente kunde data");
      }
      return res.json();
    },
    initialData: initialCustomer,
  });

  // Brug fresh data hvis tilgængelig, ellers initial data
  const currentCustomer = freshCustomer || initialCustomer;

  // Opdater edit data når fresh data kommer ind
  useEffect(() => {
    if (freshCustomer && !isEditing) {
      setEditData({
        email: freshCustomer.email || '',
        address: freshCustomer.address || '',
        city: freshCustomer.city || '',
        postalCode: freshCustomer.postalCode || '',
        notes: freshCustomer.notes || ''
      });
    }
  }, [freshCustomer, isEditing]);

  console.log("Current customer data:", currentCustomer);

  const handleRMAClick = (rmaId: number) => {
    console.log("CustomerView: RMA clicked with ID:", rmaId);
    const targetUrl = `/worker/rma/${rmaId}`;
    console.log("CustomerView: Navigating to:", targetUrl);
    
    // Luk customer sidebar først
    onClose();
    
    // Derefter naviger til RMA detaljer med lille delay
    setTimeout(() => {
      setLocation(targetUrl);
    }, 50);
  };

  // Reset edit data when starting to edit
  const handleStartEdit = () => {
    setEditData({
      email: currentCustomer.email || '',
      address: currentCustomer.address || '',
      city: currentCustomer.city || '',
      postalCode: currentCustomer.postalCode || '',
      notes: currentCustomer.notes || ''
    });
    setIsEditing(true);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({
      email: currentCustomer.email || '',
      address: currentCustomer.address || '',
      city: currentCustomer.city || '',
      postalCode: currentCustomer.postalCode || '',
      notes: currentCustomer.notes || ''
    });
  };

  // Mutation til at opdatere kunde
  const updateCustomerMutation = useMutation({
    mutationFn: async (data: Partial<Customer>) => {
      // Fjern name og phone fra data
      const { name, phone, ...updateData } = data;
      
      const res = await fetch(`/api/customers/${initialCustomer.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      if (!res.ok) {
        throw new Error("Der opstod en fejl ved opdatering af kunden");
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate alle relevante queries
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer", initialCustomer.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers", initialCustomer.id] });
      
      setIsEditing(false);
      toast({
        title: "Succes",
        description: "Kundeoplysninger er opdateret",
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

  // Save changes
  const handleSaveChanges = () => {
    updateCustomerMutation.mutate(editData);
  };

  // Hent kundens sager
  const { data: cases, isLoading: casesLoading } = useQuery<Case[]>({
    queryKey: ["/api/customers", initialCustomer.id, "cases"],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/customers/${initialCustomer.id}/cases`);
        return res.json();
      } catch (error) {
        console.error("Error fetching customer cases:", error);
        toast({
          title: "Fejl",
          description: "Der opstod en fejl ved hentning af kundens sager",
          variant: "destructive",
        });
        return [];
      }
    },
  });

  // Hent kundens RMA-sager
  const { data: rmaItems, isLoading: rmaLoading } = useQuery({
    queryKey: ["/api/customers", initialCustomer.id, "rma"],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/customers/${initialCustomer.id}/rma`);
        return res.json();
      } catch (error) {
        console.error("Error fetching customer RMAs:", error);
        toast({
          title: "Fejl",
          description: "Der opstod en fejl ved hentning af kundens RMA-sager",
          variant: "destructive",
        });
        return [];
      }
    },
  });

  // Format the date safely
  const formattedDate = currentCustomer.createdAt ? format(
    typeof currentCustomer.createdAt === 'string' ? parseISO(currentCustomer.createdAt) : currentCustomer.createdAt,
    "d. MMM yyyy",
    { locale: da }
  ) : '-';

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[600px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="space-y-2">
          <div className="flex justify-between items-center">
            <SheetTitle>
              Kunde #{formatCustomerId(currentCustomer.id)}
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Kundeoplysninger */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Kundeoplysninger</h3>
              <div className="flex gap-2">
                {!isEditing ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleStartEdit}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Rediger
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={updateCustomerMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Annuller
                    </Button>
                    <Button 
                      size="sm"
                      onClick={handleSaveChanges}
                      disabled={updateCustomerMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateCustomerMutation.isPending ? 'Gemmer...' : 'Gem'}
                    </Button>
                  </>
                )}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Navn</dt>
                <dd className="text-sm">{currentCustomer.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Telefon</dt>
                <dd className="text-sm">{currentCustomer.phone}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                <dd className="text-sm">
                  {isEditing ? (
                    <Input 
                      value={editData.email} 
                      onChange={(e) => setEditData({...editData, email: e.target.value})}
                      placeholder="Indtast email"
                    />
                  ) : (
                    currentCustomer.email || '-'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Adresse</dt>
                <dd className="text-sm">
                  {isEditing ? (
                    <Input 
                      value={editData.address} 
                      onChange={(e) => setEditData({...editData, address: e.target.value})}
                      placeholder="Indtast adresse"
                    />
                  ) : (
                    currentCustomer.address || '-'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">By</dt>
                <dd className="text-sm">
                  {isEditing ? (
                    <Input 
                      value={editData.city} 
                      onChange={(e) => setEditData({...editData, city: e.target.value})}
                      placeholder="Indtast by"
                    />
                  ) : (
                    currentCustomer.city || '-'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Postnummer</dt>
                <dd className="text-sm">
                  {isEditing ? (
                    <Input 
                      value={editData.postalCode} 
                      onChange={(e) => setEditData({...editData, postalCode: e.target.value})}
                      placeholder="Indtast postnummer"
                    />
                  ) : (
                    currentCustomer.postalCode || '-'
                  )}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">Noter</dt>
                <dd className="text-sm">
                  {isEditing ? (
                    <Textarea 
                      value={editData.notes} 
                      onChange={(e) => setEditData({...editData, notes: e.target.value})}
                      placeholder="Indtast noter"
                      rows={3}
                    />
                  ) : (
                    currentCustomer.notes || '-'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Oprettet</dt>
                <dd className="text-sm">{formattedDate}</dd>
              </div>
            </dl>
          </div>

          {/* Kundens sager */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Sager</h3>
            {casesLoading ? (
              <div>Indlæser sager...</div>
            ) : (
              <CaseList customerId={initialCustomer.id} isWorker={true} />
            )}
          </div>

          {/* Kundens RMA-sager */}
          <div>
            <h3 className="text-lg font-semibold mb-4">RMA Sager</h3>
            {rmaLoading ? (
              <div>Indlæser RMA sager...</div>
            ) : rmaItems && rmaItems.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[120px]">RMA ID</TableHead>
                      <TableHead className="w-[200px]">Beskrivelse</TableHead>
                      <TableHead className="w-[120px]">Model</TableHead>
                      <TableHead className="w-[120px]">Indleveret</TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rmaItems.map((rma) => (
                      <TableRow
                        key={rma.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRMAClick(rma.id)}
                      >
                        <TableCell>{rma.rmaNumber}</TableCell>
                        <TableCell className="whitespace-normal truncate max-w-[200px]">
                          {rma.description}
                        </TableCell>
                        <TableCell>{rma.model || '-'}</TableCell>
                        <TableCell>
                          {rma.deliveryDate 
                            ? (
                              (() => {
                                try {
                                  return format(new Date(rma.deliveryDate), "d. MMM yyyy", { locale: da });
                                } catch {
                                  return 'Ugyldig dato';
                                }
                              })()
                            )
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[statusTranslations[rma.status] || 'bg-gray-500']}>
                            {statusTranslations[rma.status] || 'Ukendt'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Ingen RMA sager fundet</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
} 