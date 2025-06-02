import { Badge } from "./badge";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  // Bestem styling baseret på status
  const getStatusColor = (status: string) => {
    const colors = {
      'created': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
      'in_progress': 'bg-blue-100 text-blue-800 hover:bg-blue-100',
      'offer_created': 'bg-orange-100 text-orange-800 hover:bg-orange-100',
      'waiting_customer': 'bg-purple-100 text-purple-800 hover:bg-purple-100',
      'offer_accepted': 'bg-green-100 text-green-800 hover:bg-green-100',
      'offer_rejected': 'bg-red-100 text-red-800 hover:bg-red-100',
      'waiting_parts': 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100',
      'preparing_delivery': 'bg-cyan-100 text-cyan-800 hover:bg-cyan-100',
      'ready_for_pickup': 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
      'completed': 'bg-green-100 text-green-800 hover:bg-green-100'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 hover:bg-gray-100';
  };

  // Map status til dansk tekst
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

  return (
    <Badge className={getStatusColor(status)} variant="outline">
      {formatStatus(status)}
    </Badge>
  );
}