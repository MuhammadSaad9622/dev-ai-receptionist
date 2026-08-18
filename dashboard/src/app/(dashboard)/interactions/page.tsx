import Link from "next/link";
import { apiServer } from "@/lib/api-server";
import type { Interaction, TriageCategory } from "@/lib/types";
import { TriageBadge } from "@/components/triage-badge";
import { formatDateTime, formatPhone } from "@/lib/format";
import { Phone, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CATEGORY_OPTIONS: { value: TriageCategory | "ALL"; label: string }[] = [
  { value: "ALL", label: "All categories" },
  { value: "EMERGENCY", label: "Emergency" },
  { value: "ROUTINE_SCHEDULING", label: "Routine" },
  { value: "QUOTE_FOLLOW_UP", label: "Quote follow-up" },
  { value: "OUT_OF_SCOPE", label: "Out of scope" },
  { value: "RETENTION", label: "Retention" },
];

type SearchParams = Promise<{ category?: string; channel?: string }>;

export default async function InteractionsPage({ searchParams }: { searchParams: SearchParams }) {
  const { category, channel } = await searchParams;

  const query = new URLSearchParams();
  if (category && category !== "ALL") query.set("category", category);
  if (channel && channel !== "ALL") query.set("channel", channel);

  const interactions = await apiServer<Interaction[]>(`/interactions?${query.toString()}`);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Interactions</h1>
          <p className="text-sm text-muted-foreground">Every call and text, and how it was triaged.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_OPTIONS.map((opt) => {
          const active = (category ?? "ALL") === opt.value;
          const href =
            opt.value === "ALL" ? "/interactions" : `/interactions?category=${opt.value}`;
          return (
            <Link key={opt.value} href={href}>
              <Badge
                variant={active ? "default" : "outline"}
                className={cn("cursor-pointer font-medium", !active && "text-muted-foreground")}
              >
                {opt.label}
              </Badge>
            </Link>
          );
        })}
      </div>

      {interactions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No interactions yet.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {interactions.map((interaction) => (
            <Link key={interaction.id} href={`/interactions/${interaction.id}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    {interaction.channel === "VOICE" ? (
                      <Phone className="h-4 w-4" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {interaction.customer?.name || formatPhone(interaction.fromNumber)}
                      </p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDateTime(interaction.createdAt)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {interaction.triageReasoning || formatPhone(interaction.fromNumber)}
                    </p>
                  </div>
                  <TriageBadge category={interaction.triageCategory} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
