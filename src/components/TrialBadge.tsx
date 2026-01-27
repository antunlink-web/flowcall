import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { differenceInDays, isPast, parseISO } from "date-fns";

export function TrialBadge() {
  const { tenant, loading } = useTenant();

  if (loading || !tenant) return null;

  // Check if tenant has trial_end_date in settings or as direct property
  const tenantData = tenant as any;
  const trialEndDate = tenantData.trial_end_date;
  
  if (!trialEndDate) return null;

  const endDate = typeof trialEndDate === 'string' ? parseISO(trialEndDate) : trialEndDate;
  const isExpired = isPast(endDate);
  const daysLeft = differenceInDays(endDate, new Date());

  if (isExpired) {
    return (
      <Badge variant="destructive" className="gap-1 text-xs">
        <Clock className="h-3 w-3" />
        Trial expired
      </Badge>
    );
  }

  const badgeVariant = daysLeft <= 3 ? "destructive" : daysLeft <= 7 ? "secondary" : "outline";

  return (
    <Badge variant={badgeVariant} className="gap-1 text-xs">
      <Clock className="h-3 w-3" />
      {daysLeft} {daysLeft === 1 ? "day" : "days"} left
    </Badge>
  );
}
