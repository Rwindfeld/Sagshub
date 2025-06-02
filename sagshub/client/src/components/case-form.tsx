import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCaseSchema, type InsertCase, type Customer } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CaseFormProps {
  onSubmit: (data: InsertCase) => void;
  isLoading?: boolean;
  defaultValues?: {
    customerId?: number;
    customerName?: string;
    customerPhone?: string;
    title?: string;
    description?: string;
    treatment?: string;
    priority?: string;
    deviceType?: string;
    accessories?: string;
    importantNotes?: string;
    loginInfo?: string;
    purchasedHere?: boolean;
    purchaseDate?: Date;
    createdByName?: string;
  };
}

export function CaseForm({ onSubmit, isLoading, defaultValues }: CaseFormProps) {
  const [searchTerm, setSearchTerm] = useState(defaultValues?.customerName || "");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const { toast } = useToast();
  const isEditing = !!defaultValues;

  const form = useForm<any>({
    resolver: zodResolver(insertCaseSchema),
    defaultValues: {
      title: defaultValues?.title || "",
      description: defaultValues?.description || "",
      treatment: defaultValues?.treatment || "repair",
      priority: defaultValues?.priority || "four_days",
      deviceType: defaultValues?.deviceType || "laptop",
      accessories: defaultValues?.accessories || "",
      importantNotes: defaultValues?.importantNotes || "",
      loginInfo: defaultValues?.loginInfo || "",
      purchasedHere: defaultValues?.purchasedHere || false,
      purchaseDate: defaultValues?.purchaseDate || null,
      customerSearch: defaultValues?.customerName || "",
      customerPhone: defaultValues?.customerPhone || "",
      customerId: defaultValues?.customerId,
      createdByName: defaultValues?.createdByName || "",
    }
  });

  useEffect(() => {
    if (defaultValues) {
      // Set customer info for editing mode
      if (defaultValues.customerId) {
        setSelectedCustomer({
          id: defaultValues.customerId,
          name: defaultValues.customerName || "",
          phone: defaultValues.customerPhone || "",
        } as Customer);
      }

      // Set form values
      form.reset({
        title: defaultValues.title || "",
        description: defaultValues.description || "",
        treatment: defaultValues.treatment || "repair",
        priority: defaultValues.priority || "four_days",
        deviceType: defaultValues.deviceType || "laptop",
        accessories: defaultValues.accessories || "",
        importantNotes: defaultValues.importantNotes || "",
        loginInfo: defaultValues.loginInfo || "",
        purchasedHere: defaultValues.purchasedHere || false,
        purchaseDate: defaultValues.purchaseDate || null,
        customerSearch: defaultValues.customerName || "",
        customerPhone: defaultValues.customerPhone || "",
        customerId: defaultValues.customerId,
        createdByName: defaultValues.createdByName || "",
      });
    }
  }, [defaultValues, form]);

  const { data: customers, isLoading: isSearching } = useQuery<Customer[]>({
    queryKey: ["/api/customers/search", searchTerm],
    queryFn: async () => {
      if (!searchTerm) return [];
      const res = await apiRequest("GET", `/api/customers/search?q=${encodeURIComponent(searchTerm)}`);
      return res.json();
    },
    enabled: searchTerm.length > 2 && !isEditing,
  });

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSearchTerm(customer.name);
    setShowDropdown(false);
    form.setValue("customerSearch", customer.name);
    form.setValue("customerPhone", customer.phone || "");
    form.setValue("customerId", customer.id);
  };

  const handleCustomerSearchChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowDropdown(true);
    field.onChange(value);
    if (!value) {
      setSelectedCustomer(null);
      form.setValue("customerPhone", "");
      form.setValue("customerId", undefined);
    }
  };

  const onFormSubmit = (rawData: any) => {
    // ANVEND FORM.GETVALUES() I STEDET FOR RAWDATA PARAMETER
    const formValues = form.getValues();
    
    
    // Hvis der er valgt kunde fra listen, brug customerId
    const customerId = isEditing
      ? defaultValues?.customerId
      : selectedCustomer?.id;
    
    // Hvis der ikke er valgt kunde, men der er indtastet telefonnummer, tillad oprettelse af ny kunde
    const isNewCustomer = !customerId && formValues.customerPhone && formValues.customerPhone.length > 5;
    
    if (!customerId && !isNewCustomer) {
      toast({
        title: "Fejl",
        description: "Vælg en kunde fra listen eller indtast et gyldigt telefonnummer for ny kunde",
        variant: "destructive",
      });
      return;
    }
    
    // Sikrer at alle felter fra schemaet er med og har korrekt fallback og type
    const data: InsertCase = {
      title: formValues.title || "",
      description: formValues.description || "",
      treatment: formValues.treatment || "repair",
      priority: formValues.priority || "four_days",
      deviceType: formValues.deviceType || "laptop",
      accessories: formValues.accessories?.trim() || "",
      importantNotes: formValues.importantNotes?.trim() || "",
      loginInfo: formValues.loginInfo?.trim() || "",
      purchasedHere: formValues.purchasedHere === true,
      purchaseDate: formValues.purchaseDate ? new Date(formValues.purchaseDate) : null,
      customerId: customerId,
      createdByName: formValues.createdByName?.trim() || undefined,
      // Kun medtag customerSearch og customerPhone hvis det er oprettelse (ikke redigering)
      ...(isEditing ? {} : {
        customerSearch: customerId ? formValues.customerSearch || selectedCustomer?.name || "" : formValues.customerSearch || "Ny kunde",
        customerPhone: customerId ? (formValues.customerPhone || selectedCustomer?.phone || "") : formValues.customerPhone,
      })
    };
    
    
    try {
      onSubmit(data);
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: "Fejl",
        description: "Der opstod en fejl ved oprettelse af sagen",
        variant: "destructive",
      });
    }
  };

  // Customer info section
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit)} className="h-[calc(100vh-180px)] overflow-y-auto">
        <div className="space-y-6 p-6">
          {/* Customer info section */}
          {isEditing ? (
            <div className="grid grid-cols-2 gap-4 bg-muted p-4 rounded-lg">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Kunde</dt>
                <dd className="text-base font-semibold mt-1">{defaultValues?.customerName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Telefonnummer</dt>
                <dd className="text-base font-semibold mt-1">{defaultValues?.customerPhone}</dd>
              </div>
            </div>
          ) : (
            <>
              <FormField
                control={form.control}
                name="customerSearch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Kunde <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="Søg efter eksisterende kunde..."
                          value={searchTerm}
                          onChange={e => handleCustomerSearchChange(e, field)}
                          onFocus={() => {
                            if (searchTerm.length > 2 && customers?.length) {
                              setShowDropdown(true);
                            }
                          }}
                          onBlur={() => {
                            setTimeout(() => setShowDropdown(false), 200);
                          }}
                        />
                        {showDropdown && searchTerm.length > 2 && customers && customers.length > 0 && (
                          <div className="absolute z-50 w-full bg-white border rounded-md shadow-lg mt-1">
                            <div className="max-h-[160px] overflow-y-auto">
                              {customers.map((customer) => (
                                <div
                                  key={customer.id}
                                  className="p-3 hover:bg-gray-100 cursor-pointer"
                                  onClick={() => handleCustomerSelect(customer)}
                                >
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium">{customer.name}</span>
                                    <span className="text-sm text-gray-600">
                                      - {customer.phone}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Telefonnummer <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="12345678"
                        {...field}
                        disabled={selectedCustomer !== null}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {/* Title */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Kort titel <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="F.eks. Skærm virker ikke" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Beskrivelse <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Beskriv problemet detaljeret..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Treatment */}
          <FormField
            control={form.control}
            name="treatment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Behandling <span className="text-red-500">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Vælg behandlingstype" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="repair">Reparation</SelectItem>
                    <SelectItem value="warranty">Reklamation</SelectItem>
                    <SelectItem value="setup">Klargøring</SelectItem>
                    <SelectItem value="other">Andet</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Priority */}
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Prioritet <span className="text-red-500">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Vælg prioritet" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="free_diagnosis">Gratis fejlsøgning</SelectItem>
                    <SelectItem value="four_days">Påbegyndt 4 hverdage</SelectItem>
                    <SelectItem value="first_priority">Første prioritering</SelectItem>
                    <SelectItem value="asap">Snarest muligt</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Device Type */}
          <FormField
            control={form.control}
            name="deviceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Enhed <span className="text-red-500">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Vælg enhedstype" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="laptop">Bærbar</SelectItem>
                    <SelectItem value="pc">PC</SelectItem>
                    <SelectItem value="printer">Printer</SelectItem>
                    <SelectItem value="other">Andet</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Accessories */}
          <FormField
            control={form.control}
            name="accessories"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tilbehør</FormLabel>
                <FormControl>
                  <Input
                    placeholder="F.eks. Oplader, mus, taske..."
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Important Notes */}
          <FormField
            control={form.control}
            name="importantNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vigtige bemærkninger</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tilføj eventuelle vigtige bemærkninger..."
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Login Info */}
          <FormField
            control={form.control}
            name="loginInfo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kode, Logininfo og Pinkode</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Indtast koder, loginoplysninger og pinkoder her..."
                    className="min-h-[80px]"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <div className="text-sm text-muted-foreground">
                  ⚠️ Denne information slettes automatisk når sagen afsluttes af sikkerhedshensyn
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Created By Name */}
          <FormField
            control={form.control}
            name="createdByName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Medarbejder (valgfrit)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Lad være tom for at bruge dit navn..."
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Purchase Info Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="text-sm font-medium">Købsoplysninger</h3>
            
            {/* Purchased Here */}
            <FormField
              control={form.control}
              name="purchasedHere"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value || false}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Produktet er købt her</FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Purchase Date */}
            <FormField
              control={form.control}
              name="purchaseDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Købsdato</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : null;
                        field.onChange(date);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || isSearching || (!selectedCustomer && !(form.getValues('customerPhone')?.length && form.getValues('customerPhone')!.length > 5))}
          >
            {isLoading || isSearching ? "Gemmer..." : (isEditing ? "Gem ændringer" : "Opret sag")}
          </Button>
        </div>
      </form>
    </Form>
  );
}