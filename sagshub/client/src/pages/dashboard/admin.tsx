import { useAuth } from "@/hooks/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, InsertUser, insertUserSchema, createUserSchema, updateUserSchema, CaseStatus, PriorityType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit2, Info, BarChart as BarChartIcon, FileText, Clock, Users, Activity, Package, AlertCircle, CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import { MenuLayout } from "@/components/menu-layout";
import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CustomerSearchInput from "@/components/customer-search-input";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useCasesQuery } from '@/queries/cases';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, parseISO, subMonths } from 'date-fns';
import { differenceInDays } from 'date-fns';
import { useAllCustomersQuery } from '@/queries/customers';
import { useRMAsQuery } from '@/queries/rma';
import { useOrdersQuery } from '@/queries/orders';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

function getStatusLabel(key: string) {
  const labels: Record<string, string> = {
    created: "Oprettet",
    in_progress: "I gang",
    offer_created: "Tilbud oprettet",
    waiting_customer: "Venter på kunde",
    offer_accepted: "Tilbud accepteret",
    offer_rejected: "Tilbud afvist",
    waiting_parts: "Venter på dele",
    preparing_delivery: "Forbereder udlevering",
    ready_for_pickup: "Klar til afhentning",
    completed: "Afsluttet",
  };
  return labels[key] || key;
}

function getPriorityLabel(key: string) {
  const labels: Record<string, string> = {
    free_diagnosis: "Gratis diagnose",
    four_days: "4-dages prioritet",
    first_priority: "Første prioritet",
    asap: "Haster (ASAP)",
  };
  return labels[key] || key;
}

export default function AdminPage() {
  // 1. Context hooks
  const { user } = useAuth();
  const { toast } = useToast();

  // 3. Query hooks (FLYTTET OP)
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      return res.json();
    },
  });

  // 2. State hooks
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [tab, setTab] = useState(user?.isAdmin ? "users" : "stats");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [statusTypes, setStatusTypes] = useState(Object.values(CaseStatus));
  const [priorityTypes, setPriorityTypes] = useState(Object.values(PriorityType));
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const [editPriority, setEditPriority] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [newPriority, setNewPriority] = useState("");

  // PAGINATION STATE
  const [staffPage, setStaffPage] = useState(1);
  const [customerPage, setCustomerPage] = useState(1);
  const USERS_PER_PAGE = 5;

  // FILTRER BRUGERE
  const staff = (users || []).filter(u => u.isWorker || u.isAdmin);
  const customers = (users || []).filter(u => !u.isWorker && !u.isAdmin);

  // PAGINERET DATA
  const paginatedStaff = staff.slice((staffPage-1)*USERS_PER_PAGE, staffPage*USERS_PER_PAGE);
  const paginatedCustomers = customers.slice((customerPage-1)*USERS_PER_PAGE, customerPage*USERS_PER_PAGE);
  const staffTotalPages = Math.ceil(staff.length / USERS_PER_PAGE) || 1;
  const customerTotalPages = Math.ceil(customers.length / USERS_PER_PAGE) || 1;

  // 4. Query hooks
  const { data: customerData } = useQuery({
    queryKey: ["/api/customers", selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return null;
      const res = await apiRequest("GET", `/api/customers/${selectedCustomerId}`);
      return res.json();
    },
    enabled: !!selectedCustomerId,
  });

  const { data: customerCases } = useQuery({
    queryKey: ["/api/customers", selectedCustomerId, "cases"],
    queryFn: async () => {
      if (!selectedCustomerId) return null;
      const res = await apiRequest("GET", `/api/customers/${selectedCustomerId}/cases`);
      return res.json();
    },
    enabled: !!selectedCustomerId,
  });

  const { data: customerOrders } = useQuery({
    queryKey: ["/api/customers", selectedCustomerId, "orders"],
    queryFn: async () => {
      if (!selectedCustomerId) return null;
      const res = await apiRequest("GET", `/api/customers/${selectedCustomerId}/orders`);
      return res.json();
    },
    enabled: !!selectedCustomerId,
  });

  const { data: customerRmas } = useQuery({
    queryKey: ["/api/customers", selectedCustomerId, "rmas"],
    queryFn: async () => {
      if (!selectedCustomerId) return null;
      try {
        const res = await apiRequest("GET", `/api/customers/${selectedCustomerId}/rmas`);
        if (res.status === 404) return []; // Returnér tomt array hvis ikke fundet
        return res.json();
      } catch {
        return [];
      }
    },
    enabled: !!selectedCustomerId,
  });

  const { data: statusTypesData, isLoading: isLoadingStatusTypes } = useQuery({
    queryKey: ["/api/cases/types/status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/cases/types/status");
      return res.json();
    },
  });

  const { data: priorityTypesData, isLoading: isLoadingPriorityTypes } = useQuery({
    queryKey: ["/api/cases/types/priority"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/cases/types/priority");
      return res.json();
    },
  });

  // 5. Form hook  
  const form = useForm<InsertUser>({
    resolver: zodResolver(editingUser ? insertUserSchema : insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      isWorker: true,
      isAdmin: false,
      birthday: null,
    },
  });

  // 6. Mutation hooks
  const userMutation = useMutation({
    mutationFn: async (data: InsertUser & { id?: number }) => {
      const method = data.id ? "PUT" : "POST";
      const endpoint = data.id ? `/api/users/${data.id}` : "/api/users";
      const res = await apiRequest(method, endpoint, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: editingUser ? "Bruger opdateret" : "Bruger oprettet",
        description: editingUser 
          ? "Medarbejderen er blevet opdateret"
          : "Den nye medarbejder er blevet oprettet",
      });
      form.reset();
      setEditingUser(null);
      setIsSheetOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fejl",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/users/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Bruger slettet",
        description: "Medarbejderen er blevet slettet",
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

  const statusTypeMutation = useMutation({
    mutationFn: async (data: { key: string; label: string; id?: number }) => {
      const method = data.id ? "PUT" : "POST";
      const endpoint = data.id
        ? `/api/cases/types/status/${data.id}`
        : "/api/cases/types/status";
      const res = await apiRequest(method, endpoint, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases/types/status"] });
      toast({ title: "Statustype opdateret", description: "Statustypen er blevet opdateret" });
    },
    onError: (error: Error) => {
      toast({ title: "Fejl", description: error.message, variant: "destructive" });
    },
  });

  const priorityTypeMutation = useMutation({
    mutationFn: async (data: { key: string; label: string; id?: number }) => {
      const method = data.id ? "PUT" : "POST";
      const endpoint = data.id
        ? `/api/cases/types/priority/${data.id}`
        : "/api/cases/types/priority";
      const res = await apiRequest(method, endpoint, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases/types/priority"] });
      toast({ title: "Prioritetstype opdateret", description: "Prioritetstypen er blevet opdateret" });
    },
    onError: (error: Error) => {
      toast({ title: "Fejl", description: error.message, variant: "destructive" });
    },
  });

  // Håndter oprettelse af bruger
  const handleCreateUser = () => {
    setEditingUser(null);
    setIsSheetOpen(true);
  };

  // Håndter lukning af sheet
  const handleCloseSheet = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setEditingUser(null);
      form.reset();
    }
  };

  // 7. Event handlers
  async function handleDeleteCustomer() {
    if (!selectedCustomerId) return;
    try {
      await apiRequest('DELETE', `/api/customers/${selectedCustomerId}`);
      toast({ title: "Kunde slettet", description: "Kunden er nu slettet." });
      setSelectedCustomerId(null);
      setShowFinalConfirm(false);
      setIsSearchingCustomer(true);
    } catch (e: any) {
      toast({ title: "Fejl", description: e?.message || "Kunne ikke slette kunden", variant: "destructive" });
    }
  }

  const onSubmit = (data: InsertUser) => {
    console.log('Form submitted with data:', data);
    
    // Rens data før sending
    const cleanData = {
      ...data,
      password: data.password?.trim() || undefined,
      birthday: data.birthday || null
    };
    
    // Hvis vi redigerer og password er tomt, fjern det fra data
    if (editingUser && !cleanData.password) {
      delete cleanData.password;
    }
    
    if (editingUser) {
      userMutation.mutate({ ...cleanData, id: editingUser.id });
    } else {
      // For nye brugere skal password være angivet
      if (!cleanData.password) {
        toast({
          title: "Fejl",
          description: "Adgangskode er påkrævet for nye brugere",
          variant: "destructive",
        });
        return;
      }
      userMutation.mutate(cleanData);
    }
  };

  const handleDownload = async () => {
    if (!selectedCustomerId || !customerData) return;

    const doc = new jsPDF();
    
    // Tilføj titel
    doc.setFontSize(20);
    doc.text(`Kundedata - ${customerData.name}`, 14, 20);
    
    // Tilføj dato
    doc.setFontSize(10);
    doc.text(`Genereret: ${new Date().toLocaleString('da-DK')}`, 14, 30);

    // Kundeoplysninger
    doc.setFontSize(16);
    doc.text('Kundeoplysninger', 14, 45);
    
    const customerInfoRows = [
      ['Navn', customerData.name],
      ['Email', customerData.email || '-'],
      ['Telefon', customerData.phone || '-'],
      ['Adresse', customerData.address || '-'],
      ['By', customerData.city || '-'],
      ['Postnummer', customerData.postalCode || '-'],
    ];

    autoTable(doc, {
      startY: 50,
      head: [['Felt', 'Værdi']],
      body: customerInfoRows,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Sager
    if (customerCases?.length) {
      doc.setFontSize(16);
      doc.text('Sager', 14, doc.lastAutoTable.finalY + 20);

      const casesData = customerCases.map(case_ => [
        case_.caseNumber,
        getStatusLabel(case_.status),
        new Date(case_.createdAt).toLocaleDateString('da-DK'),
        case_.description || '-'
      ]);

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 25,
        head: [['Sagsnummer', 'Status', 'Oprettet', 'Beskrivelse']],
        body: casesData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
      });
    }

    // Bestillinger
    if (customerOrders?.length) {
      doc.setFontSize(16);
      doc.text('Bestillinger', 14, doc.lastAutoTable.finalY + 20);

      const ordersData = customerOrders.map(order => [
        order.orderNumber,
        order.status,
        new Date(order.createdAt).toLocaleDateString('da-DK'),
        order.totalAmount?.toLocaleString('da-DK') + ' kr.'
      ]);

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 25,
        head: [['Ordrenummer', 'Status', 'Dato', 'Beløb']],
        body: ordersData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
      });
    }

    // RMA-sager
    if (customerRmas?.length) {
      doc.setFontSize(16);
      doc.text('RMA-sager', 14, doc.lastAutoTable.finalY + 20);

      const rmasData = customerRmas.map(rma => [
        rma.rmaNumber,
        rma.status,
        new Date(rma.createdAt).toLocaleDateString('da-DK'),
        rma.description || '-'
      ]);

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 25,
        head: [['RMA-nummer', 'Status', 'Dato', 'Beskrivelse']],
        body: rmasData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
      });
    }

    // Gem PDF
    doc.save(`kunde_${customerData.name}_${new Date().toISOString().split('T')[0]}.pdf`);

    toast({
      title: "Download fuldført",
      description: "Kundedata er blevet downloadet som PDF",
    });
  };

  const handlePrint = () => {
    if (!selectedCustomerId || !customerData) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Fejl",
        description: "Kunne ikke åbne print-vinduet. Tjek om popup-blokering er aktiveret.",
        variant: "destructive",
      });
      return;
    }

    const content = `
      <html>
        <head>
          <title>Kundedata - ${customerData.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            h2 { color: #666; margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .section { margin-bottom: 30px; }
          </style>
        </head>
        <body>
          <h1>Kundedata - ${customerData.name}</h1>
          <div class="section">
            <h2>Kundeoplysninger</h2>
            <table>
              <tr><th>Navn</th><td>${customerData.name}</td></tr>
              <tr><th>Email</th><td>${customerData.email || '-'}</td></tr>
              <tr><th>Telefon</th><td>${customerData.phone || '-'}</td></tr>
              <tr><th>Adresse</th><td>${customerData.address || '-'}</td></tr>
              <tr><th>By</th><td>${customerData.city || '-'}</td></tr>
              <tr><th>Postnummer</th><td>${customerData.postalCode || '-'}</td></tr>
            </table>
          </div>
          ${customerCases?.length ? `
            <div class="section">
              <h2>Sager (${customerCases.length})</h2>
              <table>
                <tr>
                  <th>Sagsnummer</th>
                  <th>Status</th>
                  <th>Oprettet</th>
                  <th>Beskrivelse</th>
                </tr>
                ${customerCases.map(case_ => `
                  <tr>
                    <td>${case_.caseNumber}</td>
                    <td>${getStatusLabel(case_.status)}</td>
                    <td>${new Date(case_.createdAt).toLocaleDateString('da-DK')}</td>
                    <td>${case_.description || '-'}</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          ` : ''}
          ${customerOrders?.length ? `
            <div class="section">
              <h2>Bestillinger (${customerOrders.length})</h2>
              <table>
                <tr>
                  <th>Ordrenummer</th>
                  <th>Status</th>
                  <th>Dato</th>
                  <th>Beløb</th>
                </tr>
                ${customerOrders.map(order => `
                  <tr>
                    <td>${order.orderNumber}</td>
                    <td>${order.status}</td>
                    <td>${new Date(order.createdAt).toLocaleDateString('da-DK')}</td>
                    <td>${order.totalAmount?.toLocaleString('da-DK')} kr.</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          ` : ''}
          ${customerRmas?.length ? `
            <div class="section">
              <h2>RMA-sager (${customerRmas.length})</h2>
              <table>
                <tr>
                  <th>RMA-nummer</th>
                  <th>Status</th>
                  <th>Dato</th>
                  <th>Beskrivelse</th>
                </tr>
                ${customerRmas.map(rma => `
                  <tr>
                    <td>${rma.rmaNumber}</td>
                    <td>${rma.status}</td>
                    <td>${new Date(rma.createdAt).toLocaleDateString('da-DK')}</td>
                    <td>${rma.description || '-'}</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          ` : ''}
          <div class="section">
            <p><small>Genereret: ${new Date().toLocaleString('da-DK')}</small></p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  // 8. Early returns
  if (!user?.isWorker) {
    return <div>Ingen adgang</div>;
  }

  if (isLoading) {
    return <div>Indlæser...</div>;
  }

  return (
    <MenuLayout>
      <div className="container mx-auto py-1 space-y-4">
        <h1 className="text-2xl font-bold mb-4">Administration</h1>
        <Tabs value={tab} onValueChange={setTab} className="mb-6">
          <TabsList>
            {user.isAdmin && <TabsTrigger value="users">Brugere</TabsTrigger>}
            {user.isAdmin && <TabsTrigger value="delete-customer">Slet kunde</TabsTrigger>}
            <TabsTrigger value="status-types">Status/prioritetstyper</TabsTrigger>
            <TabsTrigger value="download-customer">Download/print kundedata</TabsTrigger>
            <TabsTrigger value="stats">Statistik</TabsTrigger>
          </TabsList>
          <TabsContent value="users">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">{user?.isAdmin ? "Administration" : "Medarbejdere"}</h1>
              {user.isAdmin && (
                <Sheet open={isSheetOpen} onOpenChange={handleCloseSheet}>
                  <SheetTrigger asChild>
                    <Button onClick={handleCreateUser}>
                      <Plus className="w-4 h-4 mr-2" />
                      Opret medarbejder
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>
                        {editingUser ? "Rediger medarbejder" : "Opret ny medarbejder"}
                      </SheetTitle>
                    </SheetHeader>
                    <div className="py-4">
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                          <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Brugernavn</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  {editingUser ? "Ny adgangskode (lad stå tom for at beholde nuværende)" : "Adgangskode"}
                                </FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Navn</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="isWorker"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel>Er medarbejder</FormLabel>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="isAdmin"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel>Er administrator</FormLabel>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="birthday"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>Fødselsdag</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={"outline"}
                                        className={cn(
                                          "w-full pl-3 text-left font-normal",
                                          !field.value && "text-muted-foreground"
                                        )}
                                      >
                                        {field.value ? (
                                          format(field.value, "dd/MM/yyyy")
                                        ) : (
                                          <span>Vælg fødselsdag</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      disabled={(date) =>
                                        date > new Date() || date < new Date("1900-01-01")
                                      }
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            type="submit"
                            className="w-full"
                            disabled={userMutation.isPending}
                          >
                            {userMutation.isPending
                              ? "Gemmer..."
                              : editingUser
                              ? "Gem ændringer"
                              : "Opret medarbejder"}
                          </Button>
                        </form>
                      </Form>
                    </div>
                  </SheetContent>
                </Sheet>
              )}
            </div>

            {/* MEDARBEJDERE/ADMIN TABEL */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-2">Medarbejdere & Admins</h2>
              <div className="bg-white rounded-lg shadow">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Navn</TableHead>
                      <TableHead>Brugernavn</TableHead>
                      <TableHead>Type</TableHead>
                      {user.isAdmin && <TableHead>Handlinger</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStaff.map((userData) => (
                      <TableRow key={userData.id}>
                        <TableCell>{userData.name}</TableCell>
                        <TableCell>{userData.username}</TableCell>
                        <TableCell>
                          {userData.isAdmin ? "Administrator" : "Medarbejder"}
                        </TableCell>
                        {user.isAdmin && (
                          <TableCell className="space-x-2">
                            <Button variant="outline" size="icon" onClick={() => handleEditUser(userData)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="icon">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Dette vil permanent slette medarbejderen {userData.name}.
                                    Denne handling kan ikke fortrydes.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuller</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteUserMutation.mutate(userData.id)}>
                                    Slet
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {/* PAGINATION STAFF */}
                <div className="flex justify-end items-center gap-2 p-2">
                  <Button variant="outline" size="sm" onClick={() => setStaffPage(p => Math.max(1, p-1))} disabled={staffPage === 1}>
                    <ChevronLeft className="w-4 h-4" /> Forrige
                  </Button>
                  <span>Side {staffPage} af {staffTotalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setStaffPage(p => Math.min(staffTotalPages, p+1))} disabled={staffPage === staffTotalPages}>
                    Næste <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* KUNDE TABEL */}
            <div>
              <h2 className="text-lg font-semibold mb-2">Kunder</h2>
              <div className="bg-white rounded-lg shadow">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Navn</TableHead>
                      <TableHead>Brugernavn</TableHead>
                      <TableHead>Type</TableHead>
                      {user.isAdmin && <TableHead>Handlinger</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCustomers.map((userData) => (
                      <TableRow key={userData.id}>
                        <TableCell>{userData.name}</TableCell>
                        <TableCell>{userData.username}</TableCell>
                        <TableCell>Kunde</TableCell>
                        {user.isAdmin && (
                          <TableCell className="space-x-2">
                            <Button variant="outline" size="icon" onClick={() => handleEditUser(userData)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="icon">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Dette vil permanent slette kunden {userData.name}.
                                    Denne handling kan ikke fortrydes.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuller</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteUserMutation.mutate(userData.id)}>
                                    Slet
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {/* PAGINATION CUSTOMERS */}
                <div className="flex justify-end items-center gap-2 p-2">
                  <Button variant="outline" size="sm" onClick={() => setCustomerPage(p => Math.max(1, p-1))} disabled={customerPage === 1}>
                    <ChevronLeft className="w-4 h-4" /> Forrige
                  </Button>
                  <span>Side {customerPage} af {customerTotalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setCustomerPage(p => Math.min(customerTotalPages, p+1))} disabled={customerPage === customerTotalPages}>
                    Næste <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="delete-customer">
            <div className="max-w-lg space-y-4">
              <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded">
                <b>Advarsel:</b> Sletning af en kunde er <u>permanent</u> og kan <b>ikke</b> fortrydes. Alle data for kunden fjernes fra systemet.
              </div>
              <h2 className="text-lg font-semibold">Slet kunde</h2>
              <CustomerSearchInput
                onSelect={setSelectedCustomerId}
                isSearching={isSearchingCustomer}
                setIsSearching={setIsSearchingCustomer}
                selectedCustomerId={selectedCustomerId || undefined}
              />
              {selectedCustomerId && (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  className="mt-2"
                >
                  Slet denne kunde
                </Button>
              )}
              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Er du sikker på du vil slette denne kunde?</AlertDialogTitle>
                  </AlertDialogHeader>
                  <div className="text-sm text-muted-foreground">
                    Dette kan <b>ikke</b> fortrydes. Alle data for kunden slettes.
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annullér</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { setShowDeleteDialog(false); setShowFinalConfirm(true); }}>
                      Ja, fortsæt
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog open={showFinalConfirm} onOpenChange={setShowFinalConfirm}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Bekræft sletning</AlertDialogTitle>
                  </AlertDialogHeader>
                  <div className="text-sm text-red-600">
                    Er du <b>helt sikker</b> på at du vil slette denne kunde? Dette kræver admin-rettigheder.
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annullér</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={handleDeleteCustomer}>
                      Slet kunden
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </TabsContent>
          <TabsContent value="status-types">
            <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow space-y-6">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <span>Status- og prioritetstyper</span>
                <Info className="w-5 h-5 text-blue-400" />
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Herunder kan du se alle gyldige status- og prioritetstyper i systemet.<br />
                <b>Ændringer kræver, at du redigerer filen <code>shared/schema.ts</code> og genstarter backend/frontend.</b>
              </p>
              <div>
                <h3 className="text-lg font-semibold mb-2">Statustyper</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.values(CaseStatus).map((value) => (
                    <span
                      key={value}
                      className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium border border-blue-200"
                    >
                      {getStatusLabel(value)}
                      <span className="ml-2 text-xs text-gray-400">({value})</span>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 mt-4">Prioritetstyper</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.values(PriorityType).map((value) => (
                    <span
                      key={value}
                      className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium border border-green-200"
                    >
                      {getPriorityLabel(value)}
                      <span className="ml-2 text-xs text-gray-400">({value})</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="download-customer">
            <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow space-y-6">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <span>Download/print kundedata</span>
                <Info className="w-5 h-5 text-blue-400" />
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Herunder kan du søge efter en kunde og downloade eller printe deres data, herunder:
                <ul className="list-disc list-inside mt-2">
                  <li>Kundeoplysninger</li>
                  <li>Sager</li>
                  <li>Bestillinger</li>
                  <li>RMA-sager</li>
                </ul>
              </p>
              <div className="space-y-4">
                <CustomerSearchInput
                  onSelect={setSelectedCustomerId}
                  isSearching={isSearchingCustomer}
                  setIsSearching={setIsSearchingCustomer}
                  selectedCustomerId={selectedCustomerId || undefined}
                />
                {selectedCustomerId && (
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={handleDownload}
                      disabled={!customerData}
                    >
                      Download data
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handlePrint}
                      disabled={!customerData}
                    >
                      Print data
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="stats">
            <div className="p-6 bg-white rounded-xl shadow space-y-8">
              <div className="mb-8 flex items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold flex items-center gap-2">
                    <BarChartIcon className="w-8 h-8 text-blue-600" />
                    Statistik & Nøgletal
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    Få overblik over sager, kunder, behandlingstid, RMA og bestillinger – alt samlet ét sted.
                  </p>
                </div>
              </div>
              <StatsCards />
              <CasesPerMonthGraph />
              <AvgCaseTimeGraph />
              <NewCustomersGraph />
              <RmaPerMonthGraph />
              <OrdersPerMonthGraph />
              <CasesByTreatmentGraph />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MenuLayout>
  );
}

function CasesPerMonthGraph() {
  const { data, isLoading } = useCasesQuery({ page: 1, pageSize: 10000 });
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  if (isLoading) return <div>Indlæser sager...</div>;
  const cases = Array.isArray(data) ? data : (data?.items || []);

  // Aggreger sager pr. måned
  const counts: Record<string, number> = {};
  cases.forEach((c: any) => {
    const month = format(parseISO(c.createdAt), 'yyyy-MM');
    counts[month] = (counts[month] || 0) + 1;
  });
  // Sortér og lav data til graf
  let months = Object.keys(counts).sort();

  // Filtrér på valgt interval hvis angivet
  if (fromMonth) months = months.filter(m => m >= fromMonth);
  if (toMonth) months = months.filter(m => m <= toMonth);

  const chartData = months.map(month => ({ month, antal: counts[month] }));

  // Nøgletal for denne måned
  const thisMonth = format(new Date(), 'yyyy-MM');
  const casesThisMonth = counts[thisMonth] || 0;
  const lastMonth = format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM');
  const casesLastMonth = counts[lastMonth] || 0;
  const change = casesLastMonth > 0 ? Math.round(((casesThisMonth - casesLastMonth) / casesLastMonth) * 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4 border border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-5 h-5 text-blue-500" />
        <span className="text-lg font-semibold">Sager pr. måned</span>
      </div>
      <p className="text-muted-foreground text-sm mb-2">
        Udvikling i antal oprettede sager pr. måned. Hold musen over søjlerne for detaljer.
      </p>
      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm">Fra:
          <input type="month" className="ml-2 border rounded px-2 py-1" value={fromMonth} onChange={e => setFromMonth(e.target.value)} />
        </label>
        <label className="text-sm">Til:
          <input type="month" className="ml-2 border rounded px-2 py-1" value={toMonth} onChange={e => setToMonth(e.target.value)} />
        </label>
        {(fromMonth || toMonth) && (
          <button className="ml-4 text-xs text-blue-600 underline" onClick={() => { setFromMonth(''); setToMonth(''); }}>Nulstil filter</button>
        )}
      </div>
      <div className="mb-4">
        <span className="font-medium">Denne måned:</span> {casesThisMonth} sager
        <span className={change >= 0 ? 'text-green-600 ml-4' : 'text-red-600 ml-4'}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% fra sidste måned
        </span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis allowDecimals={false} />
          <Tooltip formatter={(value: any, name: any, props: any) => [`${value} sager`, 'Antal']} />
          <Bar dataKey="antal" fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function AvgCaseTimeGraph() {
  const { data, isLoading } = useCasesQuery({ page: 1, pageSize: 10000 });
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  if (isLoading) return <div>Indlæser sager...</div>;
  const cases = Array.isArray(data) ? data : (data?.items || []);

  // Filtrer kun afsluttede sager (completed, ready_for_pickup)
  const completedCases = cases.filter((c: any) => 
    c.status === 'completed' || c.status === 'ready_for_pickup'
  );

  console.log('TOTAL COMPLETED CASES:', completedCases.length);
  console.log('TOTAL CASES FROM API:', cases.length);
  
  // Debug: Find de nyeste sager (17461-17467)
  const newestCases = cases.filter((c: any) => c.id >= 17461 && c.id <= 17467);
  console.log('NYESTE TEST SAGER (17461-17467):', newestCases.length);
  newestCases.forEach((c: any) => {
    console.log('NYESTE SAG:', {id: c.id, status: c.status, updatedAt: c.updatedAt, createdAt: c.createdAt});
  });
  
  // Debug: Find alle sager med maj 2025 updatedAt
  const mayUpdatedCases = cases.filter((c: any) => {
    const updated = parseISO(c.updatedAt);
    const localDateStr = updated.toLocaleString('sv-SE', { timeZone: 'Europe/Copenhagen' });
    const localMonth = localDateStr.substring(0, 7);
    return localMonth === '2025-05';
  });
  console.log('ALLE SAGER MED MAJ 2025 UPDATED:', mayUpdatedCases.length);
  mayUpdatedCases.forEach((c: any) => {
    console.log('MAJ UPDATED SAG:', {id: c.id, status: c.status, updatedAt: c.updatedAt});
  });
  
  // Debug: Find afsluttede sager med maj 2025 updatedAt
  const mayCompletedCases = mayUpdatedCases.filter((c: any) => 
    c.status === 'completed' || c.status === 'ready_for_pickup'
  );
  console.log('MAJ 2025 AFSLUTTEDE SAGER:', mayCompletedCases.length);
  mayCompletedCases.forEach((c: any) => {
    console.log('MAJ AFSLUTTET SAG:', {id: c.id, status: c.status, updatedAt: c.updatedAt});
  });
  
  // Debug: Tjek specifikt de sager vi ved er afsluttede
  const specificCompletedCases = cases.filter((c: any) => 
    [17461, 17462, 17463, 17464, 17465, 17466, 17467].includes(c.id)
  );
  console.log('SPECIFIKKE AFSLUTTEDE SAGER (17461-17467):', specificCompletedCases.length);
  specificCompletedCases.forEach((c: any) => {
    const updated = parseISO(c.updatedAt);
    const localDateStr = updated.toLocaleString('sv-SE', { timeZone: 'Europe/Copenhagen' });
    const localMonth = localDateStr.substring(0, 7);
    console.log('SPECIFIK SAG:', {
      id: c.id, 
      status: c.status, 
      updatedAt: c.updatedAt,
      localMonth,
      isCompleted: c.status === 'completed' || c.status === 'ready_for_pickup'
    });
  });

  // Aggreger gennemsnitlig behandlingstid pr. måned
  const monthMap: Record<string, number[]> = {};
  let debugCount = 0;
  let mayCount = 0;
  completedCases.forEach((c: any) => {
    // Brug præcis tidszone-konvertering til Europe/Copenhagen
    const updated = parseISO(c.updatedAt);
    // Konverter til dansk lokal tid ved at bruge toLocaleString
    const localDateStr = updated.toLocaleString('sv-SE', { timeZone: 'Europe/Copenhagen' }); // sv-SE giver YYYY-MM-DD format
    const localMonth = localDateStr.substring(0, 7); // Tag YYYY-MM delen
    
    // Tæl maj 2025 sager
    if (localMonth === '2025-05') {
      mayCount++;
      console.log('MAJ-MATCH:', {id: c.id, updatedAt: c.updatedAt, createdAt: c.createdAt, status: c.status});
    }
    
    // Debug de første 5 sager
    if (debugCount < 5) {
      console.log('DEBUG CASE:', {
        id: c.id,
        updatedAt: c.updatedAt,
        localDateStr,
        localMonth,
        status: c.status
      });
      debugCount++;
    }
    
    let days = differenceInDays(updated, parseISO(c.createdAt));
    // Hvis differenceInDays er 0, men createdAt og updatedAt er samme dag, så sæt til 1 dag
    if (days === 0) {
      const created = parseISO(c.createdAt);
      const createdLocalStr = created.toLocaleString('sv-SE', { timeZone: 'Europe/Copenhagen' });
      const createdLocalDate = createdLocalStr.substring(0, 10); // YYYY-MM-DD
      const updatedLocalDate = localDateStr.substring(0, 10); // YYYY-MM-DD
      if (
        createdLocalDate === updatedLocalDate
      ) {
        days = 1;
      }
    }
    if (!monthMap[localMonth]) monthMap[localMonth] = [];
    monthMap[localMonth].push(days);
    // Log alle sager der matcher maj 2025
    if (localMonth === '2025-05') {
      console.log('MAJ-MATCH:', {id: c.id, updatedAt: c.updatedAt, createdAt: c.createdAt, days});
    }
  });

  // Byg de seneste 12 måneder, så grafen altid slutter med nuværende måned
  const now = new Date();
  let months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    months.push(format(subMonths(now, i), 'yyyy-MM'));
  }

  // Filtrér på valgt interval hvis angivet
  if (fromMonth) months = months.filter(m => m >= fromMonth);
  if (toMonth) months = months.filter(m => m <= toMonth);

  // Byg chartData så alle måneder er med, også dem uden data
  const chartData = months.map(month => ({
    month,
    avgDays: monthMap[month]?.length > 0
      ? Math.round(monthMap[month].reduce((a, b) => a + b, 0) / monthMap[month].length)
      : 0
  }));

  // Flyt logning herned
  console.log('months', months);
  console.log('chartData', chartData);
  console.log('MAJ 2025 COMPLETED CASES:', mayCount);

  // Nøgletal for denne og sidste måned
  const thisMonth = format(now, 'yyyy-MM');
  const lastMonth = format(subMonths(now, 1), 'yyyy-MM');
  const avgThisMonth = chartData.find(d => d.month === thisMonth)?.avgDays || 0;
  const avgLastMonth = chartData.find(d => d.month === lastMonth)?.avgDays || 0;

  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4 border border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-5 h-5 text-green-500" />
        <span className="text-lg font-semibold">Gennemsnitlig sagstid pr. måned</span>
      </div>
      <p className="text-muted-foreground text-sm mb-2">
        Udvikling i gennemsnitlig behandlingstid for afsluttede sager. Vælg periode for at filtrere.
      </p>
      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm">Fra:
          <input type="month" className="ml-2 border rounded px-2 py-1" value={fromMonth} onChange={e => setFromMonth(e.target.value)} />
        </label>
        <label className="text-sm">Til:
          <input type="month" className="ml-2 border rounded px-2 py-1" value={toMonth} onChange={e => setToMonth(e.target.value)} />
        </label>
        {(fromMonth || toMonth) && (
          <button className="ml-4 text-xs text-blue-600 underline" onClick={() => { setFromMonth(''); setToMonth(''); }}>Nulstil filter</button>
        )}
      </div>
      <div className="mb-4">
        <span className="font-medium">Denne måned:</span> {avgThisMonth} dage
        <span className="text-muted-foreground ml-4">{avgLastMonth} dage sidste måned</span>
        <span className={avgThisMonth - avgLastMonth >= 0 ? 'text-green-600 ml-4' : 'text-red-600 ml-4'}>
          {avgLastMonth > 0 ? (avgThisMonth - avgLastMonth >= 0 ? '↑' : '↓') : ''} {avgLastMonth > 0 ? Math.abs(Math.round(((avgThisMonth - avgLastMonth) / avgLastMonth) * 100)) : 0}% fra sidste måned
        </span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis allowDecimals={false} />
          <Tooltip formatter={(value: any) => [`${value} dage`, 'Gns. sagstid']} />
          <Bar dataKey="avgDays" fill="#059669" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function NewCustomersGraph() {
  const { data: customers, isLoading } = useAllCustomersQuery();
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  if (isLoading) return <div>Indlæser kunder...</div>;

  // Aggreger nye kunder pr. måned
  const counts: Record<string, number> = {};
  (customers || []).forEach((c: any) => {
    if (!c.createdAt) return;
    const month = format(parseISO(c.createdAt), 'yyyy-MM');
    counts[month] = (counts[month] || 0) + 1;
  });
  let months = Object.keys(counts).sort();

  // Filtrér på valgt interval hvis angivet
  if (fromMonth) months = months.filter(m => m >= fromMonth);
  if (toMonth) months = months.filter(m => m <= toMonth);

  const chartData = months.map(month => ({ month, antal: counts[month] }));

  // Nøgletal for denne og sidste måned
  const thisMonth = format(new Date(), 'yyyy-MM');
  const lastMonth = format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM');
  const customersThisMonth = counts[thisMonth] || 0;
  const customersLastMonth = counts[lastMonth] || 0;
  const change = customersLastMonth > 0 ? Math.round(((customersThisMonth - customersLastMonth) / customersLastMonth) * 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4 border border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-5 h-5 text-purple-500" />
        <span className="text-lg font-semibold">Nye kunder pr. måned</span>
      </div>
      <p className="text-muted-foreground text-sm mb-2">
        Udvikling i antal nye kunder pr. måned. Vælg periode for at filtrere.
      </p>
      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm">Fra:
          <input type="month" className="ml-2 border rounded px-2 py-1" value={fromMonth} onChange={e => setFromMonth(e.target.value)} />
        </label>
        <label className="text-sm">Til:
          <input type="month" className="ml-2 border rounded px-2 py-1" value={toMonth} onChange={e => setToMonth(e.target.value)} />
        </label>
        {(fromMonth || toMonth) && (
          <button className="ml-4 text-xs text-blue-600 underline" onClick={() => { setFromMonth(''); setToMonth(''); }}>Nulstil filter</button>
        )}
      </div>
      <div className="mb-4">
        <span className="font-medium">Denne måned:</span> {customersThisMonth} kunder
        <span className={change >= 0 ? 'text-green-600 ml-4' : 'text-red-600 ml-4'}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% fra sidste måned
        </span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis allowDecimals={false} />
          <Tooltip formatter={(value: any) => [`${value} kunder`, 'Antal']} />
          <Bar dataKey="antal" fill="#7c3aed" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RmaPerMonthGraph() {
  // Hent alle RMA-sager
  const { data, isLoading } = useRMAsQuery({ page: 1, pageSize: 10000 });
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  if (isLoading) return <div>Indlæser RMA-sager...</div>;
  const rmas = data?.items || [];

  // Aggreger RMA pr. måned
  const counts: Record<string, number> = {};
  rmas.forEach((rma: any) => {
    if (!rma.createdAt) return;
    const month = format(parseISO(rma.createdAt), 'yyyy-MM');
    counts[month] = (counts[month] || 0) + 1;
  });
  let months = Object.keys(counts).sort();

  // Filtrér på valgt interval hvis angivet
  if (fromMonth) months = months.filter(m => m >= fromMonth);
  if (toMonth) months = months.filter(m => m <= toMonth);

  const chartData = months.map(month => ({ month, antal: counts[month] }));

  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4 border border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="w-5 h-5 text-orange-500" />
        <span className="text-lg font-semibold">Antal RMA pr. måned</span>
      </div>
      <p className="text-muted-foreground text-sm mb-2">
        Udvikling i antal oprettede RMA-sager pr. måned. Vælg periode for at filtrere.
      </p>
      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm">Fra:
          <input type="month" className="ml-2 border rounded px-2 py-1" value={fromMonth} onChange={e => setFromMonth(e.target.value)} />
        </label>
        <label className="text-sm">Til:
          <input type="month" className="ml-2 border rounded px-2 py-1" value={toMonth} onChange={e => setToMonth(e.target.value)} />
        </label>
        {(fromMonth || toMonth) && (
          <button className="ml-4 text-xs text-blue-600 underline" onClick={() => { setFromMonth(''); setToMonth(''); }}>Nulstil filter</button>
        )}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis allowDecimals={false} />
          <Tooltip formatter={(value: any) => [`${value} RMA`, 'Antal']} />
          <Bar dataKey="antal" fill="#f59e42" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function OrdersPerMonthGraph() {
  // Hent alle bestillinger
  const { data, isLoading } = useOrdersQuery({ page: 1, pageSize: 10000 });
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  if (isLoading) return <div>Indlæser bestillinger...</div>;
  const orders = data?.items || [];

  // Aggreger bestillinger pr. måned
  const counts: Record<string, number> = {};
  orders.forEach((order: any) => {
    if (!order.createdAt) return;
    const month = format(parseISO(order.createdAt), 'yyyy-MM');
    counts[month] = (counts[month] || 0) + 1;
  });
  let months = Object.keys(counts).sort();

  // Filtrér på valgt interval hvis angivet
  if (fromMonth) months = months.filter(m => m >= fromMonth);
  if (toMonth) months = months.filter(m => m <= toMonth);

  const chartData = months.map(month => ({ month, antal: counts[month] }));

  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4 border border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <Package className="w-5 h-5 text-indigo-500" />
        <span className="text-lg font-semibold">Antal bestillinger pr. måned</span>
      </div>
      <p className="text-muted-foreground text-sm mb-2">
        Udvikling i antal oprettede bestillinger pr. måned. Vælg periode for at filtrere.
      </p>
      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm">Fra:
          <input type="month" className="ml-2 border rounded px-2 py-1" value={fromMonth} onChange={e => setFromMonth(e.target.value)} />
        </label>
        <label className="text-sm">Til:
          <input type="month" className="ml-2 border rounded px-2 py-1" value={toMonth} onChange={e => setToMonth(e.target.value)} />
        </label>
        {(fromMonth || toMonth) && (
          <button className="ml-4 text-xs text-blue-600 underline" onClick={() => { setFromMonth(''); setToMonth(''); }}>Nulstil filter</button>
        )}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis allowDecimals={false} />
          <Tooltip formatter={(value: any) => [`${value} bestillinger`, 'Antal']} />
          <Bar dataKey="antal" fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CasesByTreatmentGraph() {
  const [treatment, setTreatment] = useState('repair');
  const { data, isLoading } = useCasesQuery({ page: 1, pageSize: 10000 });
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  if (isLoading) return <div>Indlæser sager...</div>;
  const cases = Array.isArray(data) ? data : (data?.items || []);

  // Aggreger sager pr. måned for valgt behandlingstype
  const counts: Record<string, number> = {};
  cases.forEach((c: any) => {
    if (!c.treatment || c.treatment !== treatment) return;
    const month = format(parseISO(c.createdAt), 'yyyy-MM');
    counts[month] = (counts[month] || 0) + 1;
  });
  let months = Object.keys(counts).sort();

  // Filtrér på valgt interval hvis angivet
  if (fromMonth) months = months.filter(m => m >= fromMonth);
  if (toMonth) months = months.filter(m => m <= toMonth);

  const chartData = months.map(month => ({ month, antal: counts[month] }));

  // Behandlingstyper
  const treatmentOptions = [
    { value: 'repair', label: 'Reparation' },
    { value: 'warranty', label: 'Reklamation' },
    { value: 'setup', label: 'Klargøring' },
    { value: 'other', label: 'Andet' },
  ];

  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4 border border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="w-5 h-5 text-red-500" />
        <span className="text-lg font-semibold">Antal sager pr. behandlingstype pr. måned</span>
      </div>
      <p className="text-muted-foreground text-sm mb-2">
        Udvikling i antal sager pr. behandlingstype pr. måned. Vælg behandlingstype og periode for at filtrere.
      </p>
      <div className="flex items-center gap-4 mb-4">
        <Select value={treatment} onValueChange={setTreatment}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Vælg behandlingstype" />
          </SelectTrigger>
          <SelectContent>
            {treatmentOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="text-sm">Fra:
          <input type="month" className="ml-2 border rounded px-2 py-1" value={fromMonth} onChange={e => setFromMonth(e.target.value)} />
        </label>
        <label className="text-sm">Til:
          <input type="month" className="ml-2 border rounded px-2 py-1" value={toMonth} onChange={e => setToMonth(e.target.value)} />
        </label>
        {(fromMonth || toMonth) && (
          <button className="ml-4 text-xs text-blue-600 underline" onClick={() => { setFromMonth(''); setToMonth(''); }}>Nulstil filter</button>
        )}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis allowDecimals={false} />
          <Tooltip formatter={(value: any) => [`${value} sager`, 'Antal']} />
          <Bar dataKey="antal" fill="#e11d48" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatsCards() {
  const { data: casesData } = useCasesQuery({ page: 1, pageSize: 10000 });
  const { data: customers } = useAllCustomersQuery();
  const { data: rmaData } = useRMAsQuery({ page: 1, pageSize: 10000 });
  const { data: ordersData } = useOrdersQuery({ page: 1, pageSize: 10000 });

  const [alarmCount, setAlarmCount] = useState<number>(0);

  useEffect(() => {
    fetch('/api/cases/alarm-count', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setAlarmCount(data.count || 0))
      .catch(() => setAlarmCount(0));
  }, []);

  const cases = Array.isArray(casesData) ? casesData : (casesData?.items || []);
  const now = new Date();
  const thisMonth = format(now, 'yyyy-MM');

  // Alle sager
  const totalCases = cases.length;
  // Gennemsnitlig sagstid for alle afsluttede sager
  const completedCases = cases.filter((c: any) => c.status === 'completed');
  const avgDays = completedCases.length > 0
    ? Math.round(
        completedCases.reduce((sum: number, c: any) => sum + differenceInDays(parseISO(c.updatedAt), parseISO(c.createdAt)), 0) / completedCases.length
      )
    : 0;
  // Alle kunder
  const totalCustomers = customers?.length || 0;
  // Alle RMA
  const totalRmas = rmaData?.items?.length || 0;
  // Alle bestillinger
  const totalOrders = ordersData?.items?.length || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      <StatCard title="Totalt antal sager" value={totalCases} icon={<FileText className="w-5 h-5 text-blue-500" />} />
      <StatCard title="Gennemsnitlig sagstid" value={`${avgDays} dage`} icon={<Clock className="w-5 h-5 text-green-500" />} />
      <StatCard title="Totalt antal kunder" value={totalCustomers} icon={<Users className="w-5 h-5 text-purple-500" />} />
      <StatCard title="Totalt antal RMA" value={totalRmas} icon={<Activity className="w-5 h-5 text-orange-500" />} />
      <StatCard title="Totalt antal bestillinger" value={totalOrders} icon={<Package className="w-5 h-5 text-indigo-500" />} />
      <StatCard title="Sager i alarm" value={alarmCount} icon={<AlertCircle className="w-5 h-5 text-red-500" />} />
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-xl shadow p-4 flex flex-col items-start gap-2 border border-gray-100">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        {icon}
        {title}
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}