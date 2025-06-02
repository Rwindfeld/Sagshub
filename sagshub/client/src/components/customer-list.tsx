import { Customer } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface CustomerListProps {
  customers: Customer[];
  onSelectCustomer?: (customer: Customer) => void;
  disableLocalSorting?: boolean;
}

function formatCustomerId(id: number): string {
  return id.toString().padStart(4, '0');
}

type SortOption = 'newest' | 'oldest' | 'name_asc' | 'name_desc';

export function CustomerList({ customers, onSelectCustomer, disableLocalSorting = false }: CustomerListProps) {
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Sortér kunder - kun hvis local sorting er aktiveret
  const sortedCustomers = disableLocalSorting ? customers : [...customers].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } 
    else if (sortBy === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    else if (sortBy === 'name_asc') {
      return a.name.localeCompare(b.name);
    }
    else if (sortBy === 'name_desc') {
      return b.name.localeCompare(a.name);
    }
    // Default er nyeste først
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Formateret visningstekst for de aktive filtre
  const getSortLabel = () => {
    switch (sortBy) {
      case 'newest': return 'Nyeste først';
      case 'oldest': return 'Ældste først';
      case 'name_asc': return 'Navn (A-Å)';
      case 'name_desc': return 'Navn (Å-A)';
      default: return 'Nyeste først';
    }
  };

  return (
    <div className="rounded-md border">
      {!disableLocalSorting && (
      <div className="flex flex-wrap justify-between p-4 border-b">
        <div className="flex flex-wrap gap-2">
          {/* Sorterings dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm">
                Sortering: {getSortLabel()}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortBy('newest')}>
                {sortBy === 'newest' && <Check className="mr-2 h-4 w-4" />}
                Nyeste først
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('oldest')}>
                {sortBy === 'oldest' && <Check className="mr-2 h-4 w-4" />}
                Ældste først
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('name_asc')}>
                {sortBy === 'name_asc' && <Check className="mr-2 h-4 w-4" />}
                Navn (A-Å)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('name_desc')}>
                {sortBy === 'name_desc' && <Check className="mr-2 h-4 w-4" />}
                Navn (Å-A)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Viser antal kunder og aktiv sortering */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2 sm:mt-0">
          <Badge variant="secondary">
            Sorteret efter: {getSortLabel()}
          </Badge>
          <div>
            Viser {sortedCustomers.length} kunder
          </div>
        </div>
      </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kunde ID</TableHead>
            <TableHead>Navn</TableHead>
            <TableHead>Telefon</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Oprettet</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedCustomers.map((customer) => (
            <TableRow 
              key={customer.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSelectCustomer?.(customer)}
            >
              <TableCell>#{formatCustomerId(customer.id)}</TableCell>
              <TableCell className="font-medium">{customer.name}</TableCell>
              <TableCell>{customer.phone}</TableCell>
              <TableCell>{customer.email || '-'}</TableCell>
              <TableCell>
                {format(new Date(customer.createdAt), "d. MMM yyyy", { locale: da })}
              </TableCell>
            </TableRow>
          ))}
          {sortedCustomers.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                Ingen kunder fundet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}