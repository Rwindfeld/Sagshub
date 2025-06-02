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
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { RMAStatus } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

type SortOption = 'newest' | 'oldest' | 'default';

interface RMAListProps {
  rmaItems: any | any[]; // Will be properly typed once we have the schema
  isLoading?: boolean;
  sortBy: SortOption;
  onSortChange: (option: SortOption) => void;
  statusFilter: string | null;
  onStatusFilterChange: (status: string | null) => void;
  totalCount: number;
}

export function RMAList({ 
  rmaItems, 
  isLoading,
  sortBy,
  onSortChange,
  statusFilter,
  onStatusFilterChange,
  totalCount
}: RMAListProps) {
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <div>Indlæser...</div>;
  }

  // Sikrer, at rmaItems er et array
  const itemsArray = Array.isArray(rmaItems) ? rmaItems : [];

  // Log data for debugging
  console.log("RMA Items type:", typeof rmaItems);
  console.log("RMA Items:", rmaItems);
  
  // Få de unikke statustyper fra hele systemet
  const allStatuses = Object.values(RMAStatus);

  // Formateret visningstekst for de aktive filtre
  const getSortLabel = () => {
    switch (sortBy) {
      case 'newest': return 'Nyeste indlevering først';
      case 'oldest': return 'Ældste indlevering først';
      default: return 'Standard';
    }
  };

  // Ryd alle filtre
  const clearFilters = () => {
    onStatusFilterChange(null);
    onSortChange('default');
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-wrap justify-between mb-4">
          <div className="flex flex-wrap gap-2">
            {/* Dato sortering */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={sortBy !== 'default' ? "secondary" : "outline"} size="sm">
                  Sorter efter indlevering: {getSortLabel()}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onSortChange('default')}>
                  {sortBy === 'default' && <Check className="mr-2 h-4 w-4" />}
                  Standard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSortChange('newest')}>
                  {sortBy === 'newest' && <Check className="mr-2 h-4 w-4" />}
                  Nyeste indlevering først
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSortChange('oldest')}>
                  {sortBy === 'oldest' && <Check className="mr-2 h-4 w-4" />}
                  Ældste indlevering først
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Status filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={statusFilter ? "secondary" : "outline"} size="sm">
                  Status: {statusFilter ? statusTranslations[statusFilter] || 'Ukendt' : 'Alle'}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onStatusFilterChange(null)}>
                  {!statusFilter && <Check className="mr-2 h-4 w-4" />}
                  Alle
                </DropdownMenuItem>
                {allStatuses.map(status => (
                  <DropdownMenuItem 
                    key={status}
                    onClick={() => onStatusFilterChange(status)}
                  >
                    {statusFilter === status && <Check className="mr-2 h-4 w-4" />}
                    {statusTranslations[status] || 'Ukendt'}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Ryd filtre knap - kun synlig hvis der er aktive filtre */}
            {(statusFilter || sortBy !== 'default') && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Ryd filtre
              </Button>
            )}
          </div>
          
          {/* Viser antal viste RMA sager */}
          <div className="flex items-center text-sm text-muted-foreground mt-2 sm:mt-0">
            Viser {itemsArray.length} af {totalCount} RMA sager
          </div>
        </div>

        {/* Viser aktive filtre som badges */}
        {(statusFilter || sortBy !== 'default') && (
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="text-sm text-muted-foreground mr-2">Aktive filtre:</div>
            {statusFilter && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Status: {statusTranslations[statusFilter] || 'Ukendt'}
              </Badge>
            )}
            {sortBy !== 'default' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Sortering: {getSortLabel()}
              </Badge>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[120px]">RMA ID</TableHead>
                <TableHead className="w-[200px]">Kunde</TableHead>
                <TableHead className="w-[200px]">Fejlbeskrivelse</TableHead>
                <TableHead className="w-[120px]">Model</TableHead>
                <TableHead className="w-[120px]">Serienummer</TableHead>
                <TableHead className="w-[120px]">Oprettet</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsArray.length > 0 ? (
                itemsArray.map((rma) => (
                  <TableRow
                    key={rma.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setLocation(`/worker/rma/${rma.id}`)}
                  >
                    <TableCell>{rma.rmaNumber || '-'}</TableCell>
                    <TableCell className="whitespace-normal">
                      {rma.customerName || 
                      (rma.customer ? rma.customer.name : `Kunde #${rma.customerId}`)}
                    </TableCell>
                    <TableCell className="whitespace-normal truncate max-w-[200px]">
                      {rma.description || rma.faultDescription || '-'}
                    </TableCell>
                    <TableCell>{rma.model || rma.modelName || '-'}</TableCell>
                    <TableCell>{rma.serialNumber || '-'}</TableCell>
                    <TableCell>
                      {rma.createdAt 
                        ? format(new Date(rma.createdAt), "d. MMM yyyy", { locale: da })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[statusTranslations[rma.status] || 'bg-gray-500']}>
                        {statusTranslations[rma.status] || 'Ukendt'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                    Ingen RMA sager fundet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}