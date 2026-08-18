"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { EmergencyAlert } from "@/lib/types";
import { cn } from "@/lib/utils";

// Polls the open-alerts endpoint so the nav shows a live count without
// needing a websocket — good enough for a handful of alerts/day; revisit
// with realtime (Supabase Realtime or SSE) if volume grows.
const POLL_INTERVAL_MS = 15_000;

export function AlertCountBadge({ className }: { className?: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const alerts = await apiClient<EmergencyAlert[]>("/alerts");
        if (!cancelled) setCount(alerts.length);
      } catch {
        // Network hiccup or logged out — leave last-known count, middleware
        // will redirect to /login if the session actually expired.
      }
    }

    void poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!count) return null;

  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white animate-pulse",
        className,
      )}
    >
      {count}
    </span>
  );
}
