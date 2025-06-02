import { FC, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertOrderSchema, OrderStatus } from "@shared/schema";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import CustomerSearchInput from "./customer-search-input";
import { useCustomerQuery } from "@/queries/customers";
import { useAuth } from "@/hooks/auth";
import { useCreateOrderMutation, useUpdateOrderMutation, useOrderQuery } from "@/queries/orders";
import { useLocation } from "wouter";
import { useCasesQuery } from "@/queries/cases";
import { useUsersQuery } from "@/queries/users";
import { SheetClose } from "@/components/ui/sheet";

type OrderFormProps = {
  onSuccess?: () => void;
  orderId?: number;
};

// Modificeret schema til form, der håndterer customer search input separat
const orderFormSchema = z.object({
  customerId: z.number({
    required_error: "Du skal vælge en kunde",
    invalid_type_error: "Du skal vælge en kunde",
  }),
  caseId: z.number().nullable(),
  model: z.string().min(1, "Model er påkrævet"),
  serialNumber: z.string().min(1, "Serienummer er påkrævet"),
  faultDescription: z.string().optional().nullable(),
  itemsOrdered: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  price: z.string().optional().nullable(),
  orderDate: z.date().optional().nullable(),
  createdBy: z.number(),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

export const OrderForm: FC<OrderFormProps> = ({ onSuccess, orderId }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const sheetClose = document.querySelector('[data-sheet-close]') as HTMLButtonElement;
  const isEditMode = !!orderId;

  // Hent ordre data hvis vi er i redigeringstilstand
  const { data: orderData, isLoading: orderLoading } = useOrderQuery(orderId);

  const { mutate: createOrder, isPending: isCreatePending } = useCreateOrderMutation();
  const { mutate: updateOrder, isPending: isUpdatePending } = useUpdateOrderMutation();
  
  const isPending = isCreatePending || isUpdatePending;

  const { data: customerData } = useCustomerQuery(
    selectedCustomerId || (orderData?.customerId || 0), 
    {
      enabled: !!selectedCustomerId || (isEditMode && !!orderData?.customerId),
    }
  );
  
  const { data: casesData, isLoading: casesLoading } = useCasesQuery({
    customerId: selectedCustomerId || (orderData?.customerId),
  }, {
    enabled: !!selectedCustomerId || (isEditMode && !!orderData?.customerId),
  });

  const { data: usersData, isLoading: usersLoading } = useUsersQuery();

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customerId: undefined,
      caseId: null,
      model: "",
      serialNumber: "",
      faultDescription: "",
      itemsOrdered: "",
      supplier: "",
      price: "",
      orderDate: new Date(),
      createdBy: user?.id,
    },
  });

  // Opdater formular med order data når vi er i redigeringstilstand
  useEffect(() => {
    if (isEditMode && orderData && !orderLoading) {
      setSelectedCustomerId(orderData.customerId);
      
      form.setValue("customerId", orderData.customerId);
      form.setValue("caseId", orderData.caseId);
      form.setValue("model", orderData.model || "");
      form.setValue("serialNumber", orderData.serialNumber || "");
      form.setValue("faultDescription", orderData.faultDescription || "");
      form.setValue("itemsOrdered", orderData.itemsOrdered || "");
      form.setValue("supplier", orderData.supplier || "");
      form.setValue("price", orderData.price || "");
      form.setValue("orderDate", orderData.orderDate ? new Date(orderData.orderDate) : null);
      form.setValue("createdBy", orderData.createdBy);
    }
  }, [isEditMode, orderData, orderLoading, form]);

  // Opdater formular med bruger-id, når komponenten indlæses
  useEffect(() => {
    if (user && !isEditMode) {
      form.setValue("createdBy", user.id);
    }
  }, [user, form, isEditMode]);

  // Opdater formular med kundedata, når en kunde vælges
  useEffect(() => {
    if (customerData && !isEditMode) {
      form.setValue("customerId", customerData.id);
    }
  }, [customerData, form, isEditMode]);

  const onCustomerSelect = (customerId: number) => {
    console.log("Customer selected:", customerId);
    setSelectedCustomerId(customerId);
    form.setValue("customerId", customerId);
    setIsSearchingCustomer(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted");
    
    if (!user) {
      console.log("No user found");
      toast({
        title: "Fejl",
        description: "Du skal være logget ind for at oprette en bestilling",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCustomerId) {
      console.log("No customer ID selected");
      toast({
        title: "Fejl",
        description: "Du skal vælge en kunde",
        variant: "destructive",
      });
      return;
    }

    const orderDate = form.getValues("orderDate");
    console.log("Order date from form:", orderDate);

    // Kun inkluder de felter vi ønsker at opdatere i redigeringstilstand
    const orderData = isEditMode ? {
      // Ved redigering opdaterer vi kun produkt og bestillingsinfo
      model: form.getValues("model").trim(),
      serialNumber: form.getValues("serialNumber")?.trim() || null,
      faultDescription: form.getValues("faultDescription")?.trim() || null,
      itemsOrdered: form.getValues("itemsOrdered")?.trim() || "",
      supplier: form.getValues("supplier")?.trim() || "",
      price: form.getValues("price")?.trim() || null,
      orderDate: orderDate ? orderDate.toISOString() : new Date().toISOString(),
    } : {
      // Ved oprettelse inkluderer vi alle felter
      customerId: selectedCustomerId,
      caseId: form.getValues("caseId"),
      model: form.getValues("model").trim(),
      serialNumber: form.getValues("serialNumber")?.trim() || null,
      faultDescription: form.getValues("faultDescription")?.trim() || null,
      itemsOrdered: form.getValues("itemsOrdered")?.trim() || "",
      supplier: form.getValues("supplier")?.trim() || "",
      price: form.getValues("price")?.trim() || null,
      orderDate: orderDate ? orderDate.toISOString() : new Date().toISOString(),
      createdBy: user.id,
      rmaId: null
    };

    console.log(`${isEditMode ? "Updating" : "Creating"} order with data:`, orderData);

    try {
      if (isEditMode && orderId) {
        updateOrder(
          {
            id: orderId,
            data: orderData
          },
          {
            onSuccess: () => {
              console.log("Order updated successfully");
              toast({
                title: "Bestilling opdateret",
                description: "Bestillingen er blevet opdateret",
              });
              if (onSuccess) {
                onSuccess();
              }
              // Luk formularen
              if (sheetClose) {
                sheetClose.click();
              }
            },
            onError: (error) => {
              console.error("Error updating order:", error);
              toast({
                title: "Fejl ved opdatering af bestilling",
                description: error.message || "Der skete en fejl ved opdatering af bestillingen",
                variant: "destructive",
              });
            },
          }
        );
      } else {
        createOrder(
          orderData,
          {
            onSuccess: () => {
              console.log("Order created successfully");
              toast({
                title: "Bestilling oprettet",
                description: "Bestillingen er blevet oprettet",
              });
              if (onSuccess) {
                onSuccess();
              } else {
                setLocation("/worker/orders");
              }
              // Luk formularen
              if (sheetClose) {
                sheetClose.click();
              }
            },
            onError: (error) => {
              console.error("Error creating order:", error);
              console.error("Error details:", {
                name: error.name,
                message: error.message,
                stack: error.stack,
              });
              toast({
                title: "Fejl ved oprettelse af bestilling",
                description: error.message || "Der skete en fejl ved oprettelse af bestillingen",
                variant: "destructive",
              });
            },
          }
        );
      }
    } catch (error) {
      console.error(`Exception caught while ${isEditMode ? "updating" : "creating"} order:`, error);
      toast({
        title: "Uventet fejl",
        description: `Der skete en uventet fejl ved ${isEditMode ? "opdatering" : "oprettelse"} af bestillingen`,
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form 
        onSubmit={handleSubmit} 
        className="space-y-6"
      >
        <div className="space-y-4">
          <div className={`p-4 border rounded-md bg-muted/50 ${isEditMode ? 'opacity-70' : ''}`}>
            <h3 className="text-lg font-medium mb-4">Kundeoplysninger</h3>
            <div className="grid gap-4">
              <div>
                <FormLabel>Kunde</FormLabel>
                {isEditMode ? (
                  <div className="p-2 border rounded-md">
                    {orderData?.customerName || (customerData?.name || 'Kunde')}
                  </div>
                ) : (
                  <CustomerSearchInput
                    onSelect={onCustomerSelect}
                    isSearching={isSearchingCustomer}
                    setIsSearching={setIsSearchingCustomer}
                    selectedCustomerId={selectedCustomerId || undefined}
                  />
                )}
              </div>

              <FormField
                control={form.control}
                name="caseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="caseId">Tilknyt sag</FormLabel>
                    {isEditMode ? (
                      <div className="p-2 border rounded-md">
                        {orderData?.case ? `#${orderData.case.caseNumber}` : 'Ingen sag tilknyttet'}
                      </div>
                    ) : (
                      <Select
                        disabled={!selectedCustomerId || casesLoading}
                        onValueChange={(value) => field.onChange(value === "none" ? null : Number(value))}
                        value={field.value?.toString() || "none"}
                      >
                        <FormControl>
                          <SelectTrigger id="caseId">
                            <SelectValue placeholder="Vælg sag" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Ingen sag</SelectItem>
                          {casesData?.items?.map((caseItem) => (
                            <SelectItem key={caseItem.id} value={caseItem.id.toString()}>
                              #{caseItem.caseNumber} - {caseItem.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="p-4 border rounded-md bg-muted/50">
            <h3 className="text-lg font-medium mb-4">Produktinformation</h3>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="model">Model</FormLabel>
                      <FormControl>
                        <Input id="model" placeholder="Model" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="serialNumber">Serienummer</FormLabel>
                      <FormControl>
                        <Input id="serialNumber" placeholder="Serienummer" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="faultDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="faultDescription">Fejlbeskrivelse</FormLabel>
                    <FormControl>
                      <Textarea id="faultDescription" placeholder="Beskrivelse af fejl" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="p-4 border rounded-md bg-muted/50">
            <h3 className="text-lg font-medium mb-4">Bestillingsinformation</h3>
            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="itemsOrdered"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="itemsOrdered">Bestilt</FormLabel>
                    <FormControl>
                      <Textarea id="itemsOrdered" placeholder="Hvad bestilles" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="supplier">Leverandør</FormLabel>
                      <FormControl>
                        <Input id="supplier" placeholder="Leverandør" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="price">Pris (inkl. fragt)</FormLabel>
                      <FormControl>
                        <Input id="price" placeholder="Pris" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="orderDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel htmlFor="orderDate">Bestillingsdato</FormLabel>
                    <div className="relative">
                      <Button
                        id="orderDate"
                        variant={"outline"}
                        className="w-full pl-3 text-left font-normal"
                        onClick={(e) => {
                          e.preventDefault();
                          const calendar = document.getElementById('calendar-popup');
                          if (calendar) {
                            calendar.style.display = calendar.style.display === 'none' ? 'block' : 'none';
                          }
                        }}
                      >
                        {field.value ? (
                          format(field.value, "d. MMMM yyyy", { locale: da })
                        ) : (
                          <span>Vælg dato</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                      <div 
                        id="calendar-popup" 
                        className="absolute z-50 mt-1 bg-white border rounded-md shadow-lg"
                        style={{ display: 'none' }}
                      >
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            console.log("Date selected:", date);
                            field.onChange(date);
                            const calendar = document.getElementById('calendar-popup');
                            if (calendar) {
                              calendar.style.display = 'none';
                            }
                          }}
                          disabled={(date) => date > new Date()}
                          initialFocus
                          locale={da}
                          fromDate={new Date(2000, 0, 1)}
                          toDate={new Date(2100, 11, 31)}
                        />
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (sheetClose) {
                sheetClose.click();
              } else {
                setLocation("/worker/orders");
              }
            }}
          >
            Annuller
          </Button>
          <Button 
            type="submit" 
            disabled={isPending || (isSearchingCustomer || !selectedCustomerId) && !isEditMode}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Opdater bestilling' : 'Opret bestilling'}
          </Button>
        </div>
      </form>
    </Form>
  );
}; 