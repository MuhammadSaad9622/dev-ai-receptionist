"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Siren } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import type { EmergencyAlert } from "@/lib/types";

const POLL_INTERVAL_MS = 15_000;

// Sticky top banner shown on every dashboard page while an emergency alert
// is unacked — the PRD requirement is that this can't depend on the owner
// happening to be on the /alerts page already.
export function EmergencyBanner() {
  const pathname = usePathname();
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await apiClient<EmergencyAlert[]>("/alerts");
        if (!cancelled) setAlerts(data);
      } catch {
        // ignore — see AlertCountBadge
      }
    }

    void poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (alerts.length === 0 || pathname.startsWith("/alerts")) return null;

  return (
    <Link
      href="/alerts"
      className="flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-red-500"
    >
      <Siren className="h-4 w-4 animate-pulse" />
      {alerts.length === 1
        ? "1 emergency needs acknowledgment"
        : `${alerts.length} emergencies need acknowledgment`}
      <span className="underline underline-offset-2">View</span>
    </Link>
  );
}
