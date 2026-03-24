import { cn } from "@/lib/utils";
import { LeadStatus } from "@/types/crm";
import { useTranslation } from "@/hooks/useTranslation";

interface LeadStatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

const statusStyles: Record<LeadStatus, string> = {
  new: "status-new",
  contacted: "status-contacted",
  qualified: "status-qualified",
  callback: "status-callback",
  won: "status-won",
  lost: "status-lost",
  archived: "status-archived",
};

export function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  const t = useTranslation();
  
  const statusLabels: Record<LeadStatus, string> = {
    new: t.statusNew,
    contacted: t.statusContacted,
    qualified: t.statusQualified,
    callback: t.statusCallback,
    won: t.statusWon,
    lost: t.statusLost,
    archived: t.statusArchived,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        statusStyles[status],
        className
      )}
    >
      {statusLabels[status]}
    </span>
  );
}