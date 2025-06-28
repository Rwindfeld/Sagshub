import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

// Tilføj dansk oversættelse for sag status
const formatStatus = (status: string) => {
  const statuses = {
    'created': 'Oprettet',
    'in_progress': 'Under behandling',
    'offer_created': 'Tilbud oprettet',
    'waiting_customer': 'Afventer kunde',
    'offer_accepted': 'Tilbud godkendt',
    'offer_rejected': 'Tilbud afvist',
    'waiting_parts': 'Afventer dele',
    'preparing_delivery': 'Klargøring til levering',
    'ready_for_pickup': 'Klar til afhentning',
    'completed': 'Afsluttet'
  };
  return statuses[status as keyof typeof statuses] || status;
};

const getStatusColor = (status: string) => {
  // Map both English and Danish status to colors
  const statuses: { [key: string]: string } = {
    // Danish translations (for both RMA and Cases)
    'Oprettet': 'bg-yellow-100 text-yellow-800',
    'Under behandling': 'bg-blue-100 text-blue-800',
    'Afventer leverandør': 'bg-purple-100 text-purple-800',
    'Klar til returnering': 'bg-cyan-100 text-cyan-800',
    'Afsluttet': 'bg-green-100 text-green-800',
    'Afvist': 'bg-red-100 text-red-800',
    'Afventer kunde': 'bg-orange-100 text-orange-800',
    'Tilbud oprettet': 'bg-orange-100 text-orange-800',
    'Tilbud afvist': 'bg-red-100 text-red-800',
    'Afventer dele': 'bg-purple-100 text-purple-800',
    'Klargøring til levering': 'bg-cyan-100 text-cyan-800',
    'Klar til afhentning': 'bg-green-100 text-green-800',

    // English keys (for fallback)
    'created': 'bg-yellow-100 text-yellow-800',
    'in_progress': 'bg-blue-100 text-blue-800',
    'waiting_supplier': 'bg-purple-100 text-purple-800',
    'ready_for_return': 'bg-cyan-100 text-cyan-800',
    'completed': 'bg-green-100 text-green-800',
    'rejected': 'bg-red-100 text-red-800',
    'waiting_customer': 'bg-orange-100 text-orange-800',
    'offer_created': 'bg-orange-100 text-orange-800',
    'offer_rejected': 'bg-red-100 text-red-800',
    'waiting_parts': 'bg-purple-100 text-purple-800',
    'preparing_delivery': 'bg-cyan-100 text-cyan-800',
    'ready_for_pickup': 'bg-green-100 text-green-800'
  };

  return statuses[status] || 'bg-gray-100 text-gray-800';
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  // Oversæt status til dansk uanset om det er med underscore eller ej
  const displayStatus = formatStatus(status);

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        getStatusColor(displayStatus),
        className
      )}
    >
      {displayStatus}
    </span>
  );
}