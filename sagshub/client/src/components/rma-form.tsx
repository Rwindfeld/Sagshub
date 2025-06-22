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
      customerName: "",
      invoiceNumber: "",
      faultDate: new Date(),
      faultDescription: "",
      rmaNumber: "",
      sku: "",
      modelName: "",
      serialNumber: "",
      supplier: "",
    },
  });

  // Fetch customers for search
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/customers");
      return res.json();
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Kundedata sektion */}
        <Card>
          <CardHeader>
            <CardTitle>Kundedata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="customerName"
              rules={{ required: "Kundenavn er påkrævet" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kundenavn</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="Indtast eller søg efter kunde..."
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          // Hvis brugeren skriver manuelt, nulstil customerId
                          if (form.getValues("customerId")) {
                            form.setValue("customerId", null);
                          }
                        }}
                      />
                      <div className="absolute inset-x-0 top-full mt-1">
                        {field.value && customers.length > 0 && !form.getValues("customerId") && !isEditing && (
                          <Card>
                            <CardContent className="p-0">
                              <Command>
                                <CommandInput placeholder="Søg efter kunde..." />
                                <CommandEmpty>Ingen kunder fundet.</CommandEmpty>
                                <CommandGroup>
                                  {customers
                                    .filter((customer) =>
                                      customer.name.toLowerCase().includes(field.value.toLowerCase())
                                    )
                                    .map((customer) => (
                                      <CommandItem
                                        key={customer.id}
                                        value={customer.name}
                                        onSelect={() => {
                                          form.setValue("customerName", customer.name);
                                          form.setValue("customerId", customer.id);
                                        }}
                                      >
                                        {customer.name}
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              </Command>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="invoiceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fakturanummer</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="faultDate"
              rules={{ required: "Fejlmeldingsdato er påkrævet" }}
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fejlmeldt dato</FormLabel>
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
              name="faultDescription"
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
            {!isEditing && (
              <FormField
                control={form.control}
                name="rmaNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RMA Nummer</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU/Varenummer</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="modelName"
              rules={{ required: "Modelnavn er påkrævet" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelnavn</FormLabel>
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
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Gemmer..." : isEditing ? "Gem ændringer" : "Opret RMA"}
        </Button>
      </form>
    </Form>
  );
}