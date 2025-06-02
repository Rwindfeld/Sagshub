import { Badge } from "@/components/ui/badge";

const statusColors = {
  pending: "bg-yellow-500",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  cancelled: "bg-red-500"
} as const;

const statusLabels = {
  pending: "Afventer",
  in_progress: "I gang",
  completed: "Færdig",
  cancelled: "Annulleret"
} as const;

export type CaseStatus = keyof typeof statusColors;

export function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <Badge className={`${statusColors[status]} text-white`}>
      {statusLabels[status]}
    </Badge>
  );
}