import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NEUTRAL = "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
const POSITIVE = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
const WARNING = "bg-amber-500/15 text-amber-400 border-amber-500/30";
const NEGATIVE = "bg-red-500/15 text-red-400 border-red-500/30";

const QUOTE_STYLES: Record<string, string> = {
  OPEN: WARNING,
  FOLLOWING_UP: WARNING,
  WON: POSITIVE,
  LOST: NEGATIVE,
  EXPIRED: NEUTRAL,
};

const APPOINTMENT_STYLES: Record<string, string> = {
  SCHEDULED: WARNING,
  CONFIRMED: POSITIVE,
  COMPLETED: POSITIVE,
  CANCELLED: NEGATIVE,
  NO_SHOW: NEGATIVE,
};

const ALERT_STYLES: Record<string, string> = {
  PENDING: NEGATIVE,
  ESCALATED: NEGATIVE,
  ACKED: WARNING,
  RESOLVED: POSITIVE,
};

function StatusBadge({ status, styles }: { status: string; styles: Record<string, string> }) {
  return (
    <Badge variant="outline" className={cn("font-medium", styles[status] ?? NEUTRAL)}>
      {status.replace(/_/g, " ").toLowerCase()}
    </Badge>
  );
}

export const QuoteStatusBadge = ({ status }: { status: string }) => (
  <StatusBadge status={status} styles={QUOTE_STYLES} />
);
export const AppointmentStatusBadge = ({ status }: { status: string }) => (
  <StatusBadge status={status} styles={APPOINTMENT_STYLES} />
);
export const AlertStatusBadge = ({ status }: { status: string }) => (
  <StatusBadge status={status} styles={ALERT_STYLES} />
);
