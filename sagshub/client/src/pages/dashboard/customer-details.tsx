import { useQuery } from "@tanstack/react-query";
import { Customer } from "@shared/schema";
import { CustomerView } from "@/components/customer-view";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react"; 
import { MenuLayout } from "@/components/menu-layout";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface CustomerDetailsProps {
  id: string;
}

export default function CustomerDetailsPage({ id }: CustomerDetailsProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const customerId = parseInt(id || "");

  console.log("CustomerDetailsPage - Raw ID:", id);
  console.log("CustomerDetailsPage - Parsed ID:", customerId);
  console.log("CustomerDetailsPage - isNaN check:", isNaN(customerId));

  const { data: customer, isLoading, error } = useQuery<Customer>({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      console.log("Making API request for customer ID:", customerId);
      const res = await apiRequest("GET", `/api/customers/${customerId}`);
      
      if (!res.ok) {
        console.log("API request failed with status:", res.status);
        if (res.status === 404) {
          throw new Error("Kunde ikke fundet");
        }
        throw new Error(`Fejl ved hentning af kunde: ${res.status}`);
      }
      
      return res.json();
    },
    enabled: !isNaN(customerId),
    retry: 1,
  });

  if (isNaN(customerId)) {
    return (
      <MenuLayout>
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600">Ugyldigt kunde-ID</h2>
            <Button 
              onClick={() => setLocation("/worker/customers")}
              className="mt-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tilbage til kunder
            </Button>
          </div>
        </div>
      </MenuLayout>
    );
  }

  if (isLoading) {
    return (
      <MenuLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MenuLayout>
    );
  }

  if (error || !customer) {
    return (
      <MenuLayout>
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600">
              {error?.message || "Kunde ikke fundet"}
            </h2>
            <Button 
              onClick={() => setLocation("/worker/customers")}
              className="mt-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tilbage til kunder
            </Button>
          </div>
        </div>
      </MenuLayout>
    );
  }

  return (
    <MenuLayout>
      <div className="p-6">
        <div className="mb-6">
          <Button 
            variant="outline"
            onClick={() => setLocation("/worker/customers")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbage til kunder
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">
            Kunde detaljer - {customer.name}
          </h2>
        </div>

        <CustomerView
          customer={customer}
          onClose={() => setLocation("/worker/customers")}
        />
      </div>
    </MenuLayout>
  );
} 