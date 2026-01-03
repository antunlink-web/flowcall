import { cn } from "@/lib/utils";
import { LeadStatus } from "@/types/crm";

interface LeadStatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: "New", className: "status-new" },
  contacted: { label: "Contacted", className: "status-contacted" },
  qualified: { label: "Qualified", className: "status-qualified" },
  callback: { label: "Callback", className: "status-callback" },
  won: { label: "Won", className: "status-won" },
  lost: { label: "Lost", className: "status-lost" },
  archived: { label: "Archived", className: "status-archived" },
};

export function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}