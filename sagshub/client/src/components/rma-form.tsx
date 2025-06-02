import { useForm } from "react-hook-form";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

interface Customer {
  id: number;
  name: string;
  phone?: string;
}

interface RMAFormProps {
  onSubmit: (data: any) => void;
  isLoading?: boolean;
  defaultValues?: any;
  isEditing?: boolean;
}

export function RMAForm({ onSubmit, isLoading, defaultValues, isEditing }: RMAFormProps) {
  const form = useForm({
    defaultValues: defaultValues || {
      customerId: null as number | null,
      customerSearch: "",
      description: "",
      deliveryDate: new Date(),
      sku: "",
      model: "",
      serialNumber: "",
      supplier: "",
      supplierRmaId: "",
      shipmentDate: null as Date | null,
    },
  });

  // Fetch customers for search
  const { data: customersData } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/customers?pageSize=100");
      return res.json();
    },
  });

  const customers = customersData?.items || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 overflow-y-auto max-h-[calc(100vh-120px)]">
        {/* Kundedata sektion */}
        <Card>
          <CardHeader>
            <CardTitle>Kundedata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="customerSearch"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kunde</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? field.value : "Vælg kunde..."}
                              <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Søg efter kunde..." />
                            <CommandEmpty>Ingen kunder fundet.</CommandEmpty>
                            <CommandGroup>
                              {customers.map((customer) => (
                                <CommandItem
                                  key={customer.id}
                                  onSelect={() => {
                                    form.setValue("customerSearch", customer.name);
                                    form.setValue("customerId", customer.id);
                                  }}
                                >
                                  {customer.name} - {customer.phone}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="deliveryDate"
              rules={{ required: "Indleveringsdato er påkrævet" }}
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Indleveringsdato</FormLabel>
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
                            format(field.value, "d. MMMM yyyy", { locale: da })
                          ) : (
                            <span>Vælg en dato</span>
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

            <FormField
              control={form.control}
              name="description"
              rules={{ required: "Fejlbeskrivelse er påkrævet" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fejlbeskrivelse</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Produktdata sektion */}
        <Card>
          <CardHeader>
            <CardTitle>Produktdata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Varenummer/SKU</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>Serienummer</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leverandør</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="supplierRmaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leverandør RMA Nummer</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Indtast leverandørens RMA nummer" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="shipmentDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Afsendelsesdato</FormLabel>
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
                            format(field.value, "d. MMMM yyyy", { locale: da })
                          ) : (
                            <span>Vælg en dato</span>
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
                          date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="sticky bottom-0 pt-4 pb-2 bg-white">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Gemmer..." : isEditing ? "Gem ændringer" : "Opret RMA"}
          </Button>
        </div>
      </form>
    </Form>
  );
}