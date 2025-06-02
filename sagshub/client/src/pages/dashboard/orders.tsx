import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { MenuLayout } from "@/components/menu-layout";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { OrderList } from "@/components/order-list";
import { OrderForm } from "@/components/order-form";
import { useOrdersQuery } from "@/queries/orders";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const OrderStatus = {
  PENDING: 'pending',
  ORDERED: 'ordered',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
} as const;

export default function OrdersPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sort, setSort] = useState<string>("-createdAt");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading, isError, error } = useOrdersQuery({
    page,
    pageSize: 10,
    searchTerm: debouncedSearch || undefined,
    status: status || undefined,
    sort,
  });

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleCreateSuccess = () => {
    toast({
      title: "Bestilling oprettet",
      description: "Bestillingen er blevet oprettet med succes",
    });
  };

  const getSortLabel = (sortValue: string) => {
    switch (sortValue) {
      case "-createdAt":
        return "Nyeste først";
      case "createdAt":
        return "Ældste først";
      case "-orderDate":
        return "Bestillingsdato (nyeste først)";
      case "orderDate":
        return "Bestillingsdato (ældste først)";
      default:
        return "Sorter";
    }
  };

  return (
    <MenuLayout>
      <div className="container mx-auto py-1">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bestillinger</h1>
            <p className="text-muted-foreground">
              Administrer dine bestillinger her
            </p>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Ny bestilling
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-2xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Opret ny bestilling</SheetTitle>
              </SheetHeader>
              <div className="py-4">
                <OrderForm onSuccess={handleCreateSuccess} />
              </div>
              <SheetClose data-sheet-close />
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Søg bestillinger eller kundenavn..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={status}
              onValueChange={(value) => setStatus(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Alle statusser" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle statusser</SelectItem>
                <SelectItem value={OrderStatus.PENDING}>Afventer</SelectItem>
                <SelectItem value={OrderStatus.ORDERED}>Bestilt</SelectItem>
                <SelectItem value={OrderStatus.SHIPPED}>Afsendt</SelectItem>
                <SelectItem value={OrderStatus.DELIVERED}>Leveret</SelectItem>
                <SelectItem value={OrderStatus.CANCELLED}>Annulleret</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sort}
              onValueChange={(value) => setSort(value)}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Sorter">
                  {getSortLabel(sort)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-createdAt">Nyeste først</SelectItem>
                <SelectItem value="createdAt">Ældste først</SelectItem>
                <SelectItem value="-orderDate">Bestillingsdato (nyeste først)</SelectItem>
                <SelectItem value="orderDate">Bestillingsdato (ældste først)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isError && (
          <div className="p-6 text-center">
            <p className="text-red-500">En fejl opstod: {error?.message || 'Kunne ikke hente bestillinger'}</p>
          </div>
        )}

        {!isError && (
          <OrderList
            orders={data?.items || []}
            isLoading={isLoading}
            currentPage={page}
            totalPages={data?.totalPages || 1}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </MenuLayout>
  );
}
