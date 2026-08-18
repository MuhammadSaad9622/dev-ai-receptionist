"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Siren, Phone, MessageSquare, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type { EmergencyAlert } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertStatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPhone, formatRelative } from "@/lib/format";

const POLL_INTERVAL_MS = 10_000;

async function fetchAlerts(): Promise<EmergencyAlert[]> {
  return apiClient<EmergencyAlert[]>("/alerts");
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<EmergencyAlert[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    async function poll() {
      try {
        const data = await fetchAlerts();
        if (mounted.current) setAlerts(data);
      } catch {
        toast.error("Couldn't load alerts.");
      }
    }

    void poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, []);

  function ack(alertId: string) {
    startTransition(async () => {
      try {
        await apiClient(`/alerts/${alertId}/ack`, { method: "POST" });
        toast.success("Acknowledged — escalation stopped.");
        setAlerts(await fetchAlerts());
      } catch {
        toast.error("Couldn't acknowledge — try again.");
      }
    });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Emergency alerts</h1>
        <p className="text-sm text-muted-foreground">
          True emergencies from calls and texts, escalating until someone acks.
        </p>
      </div>

      {alerts === null && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {alerts?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <p className="text-sm font-medium">No open emergencies</p>
            <p className="text-xs text-muted-foreground">You&apos;re all caught up.</p>
          </CardContent>
        </Card>
      )}

      {alerts?.map((alert) => {
        const { interaction } = alert;
        return (
          <Card key={alert.id} className="border-red-500/40">
            <CardContent className="flex flex-col gap-3 py-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Siren className="h-5 w-5 text-red-500" />
                  <span className="text-sm font-semibold">
                    {interaction.customer?.name || formatPhone(interaction.fromNumber)}
                  </span>
                </div>
                <AlertStatusBadge status={alert.status} />
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {interaction.channel === "VOICE" ? (
                  <Phone className="h-3.5 w-3.5" />
                ) : (
                  <MessageSquare className="h-3.5 w-3.5" />
                )}
                {formatPhone(interaction.fromNumber)}
                <span>·</span>
                {formatRelative(alert.createdAt)}
              </div>

              {interaction.triageReasoning && (
                <p className="rounded-md bg-red-500/10 p-3 text-sm">{interaction.triageReasoning}</p>
              )}

              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/interactions/${interaction.id}`}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  View full interaction
                </Link>
                <Button size="sm" onClick={() => ack(alert.id)} disabled={isPending}>
                  Acknowledge
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
