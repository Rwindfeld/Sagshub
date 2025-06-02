import { FC } from "react";
import { Order } from "@shared/schema";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, PenSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { PaginationNav } from "@/components/pagination-nav";

interface OrderListProps {
  orders: Order[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const OrderList: FC<OrderListProps> = ({
  orders,
  isLoading,
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Afventer</Badge>;
      case "ordered":
        return <Badge variant="default">Bestilt</Badge>;
      case "shipped":
        return <Badge variant="secondary">Afsendt</Badge>;
      case "delivered":
        return <Badge variant="success">Leveret</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Annulleret</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bestilling</TableHead>
            <TableHead>Kunde</TableHead>
            <TableHead>Bestillingsdato</TableHead>
            <TableHead>Produkt</TableHead>
            <TableHead>Leverandør</TableHead>
            <TableHead>Pris</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Handlinger</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            // Skelet loading state
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                {Array.from({ length: 8 }).map((_, cellIndex) => (
                  <TableCell key={cellIndex}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                Ingen bestillinger fundet.
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">#{order.orderNumber}</TableCell>
                <TableCell>{order.customerName}</TableCell>
                <TableCell>
                  {order.orderDate
                    ? format(new Date(order.orderDate), "d. MMM yyyy", { locale: da })
                    : "-"}
                </TableCell>
                <TableCell>
                  {order.model || "Ikke angivet"}
                </TableCell>
                <TableCell>{order.supplier}</TableCell>
                <TableCell>{order.price || "-"}</TableCell>
                <TableCell>{getStatusBadge(order.status)}</TableCell>
                <TableCell className="text-right">
                  <Link to={`/worker/orders/${order.id}`}>
                    <Button variant="ghost" size="icon">
                      <PenSquare className="h-4 w-4" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {!isLoading && totalPages > 1 && (
        <div className="p-4 border-t">
          <PaginationNav
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}; 