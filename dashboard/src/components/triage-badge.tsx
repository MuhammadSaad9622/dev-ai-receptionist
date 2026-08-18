import { Badge } from "@/components/ui/badge";
import type { TriageCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

// Color key matches the source doc's System Flow diagram: red = true
// emergency, green = routine/scheduling, amber = quote follow-up,
// gray = out-of-scope/cold, purple = retention/rebooking.
const STYLES: Record<TriageCategory, string> = {
  EMERGENCY: "bg-red-500/15 text-red-400 border-red-500/30",
  ROUTINE_SCHEDULING: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  QUOTE_FOLLOW_UP: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  OUT_OF_SCOPE: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  RETENTION: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  UNCLASSIFIED: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30",
};

const LABELS: Record<TriageCategory, string> = {
  EMERGENCY: "Emergency",
  ROUTINE_SCHEDULING: "Routine",
  QUOTE_FOLLOW_UP: "Quote follow-up",
  OUT_OF_SCOPE: "Out of scope",
  RETENTION: "Retention",
  UNCLASSIFIED: "Unclassified",
};

export function TriageBadge({ category }: { category: TriageCategory }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STYLES[category])}>
      {LABELS[category]}
    </Badge>
  );
}
