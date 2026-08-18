"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Full FCM push delivery needs a Firebase project (VAPID key + service
// worker) that isn't provisioned yet — backend/src/notifications is a
// documented stub waiting on it (see backend/README.md). Requesting browser
// notification permission now means it's ready to wire up the moment that
// project exists; until then, the in-app emergency banner + /alerts polling
// (10s) is the real-time path.
export function PushPermission() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    // Reads a browser-only global after mount so server and first-client
    // render both produce "default" (avoiding an SSR/hydration mismatch),
    // then syncs to the real value once we're on the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPermission("Notification" in window ? Notification.permission : "unsupported");
  }, []);

  async function requestPermission() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      toast.success("Browser notifications enabled.");
    } else if (result === "denied") {
      toast.error("Notifications blocked — enable them in your browser settings.");
    }
  }

  if (permission === "unsupported") return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          {permission === "granted" ? (
            <BellRing className="h-4 w-4 text-emerald-500" />
          ) : (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
          Browser notifications: <span className="font-medium">{permission}</span>
        </div>
        {permission !== "granted" && (
          <Button size="sm" variant="outline" onClick={requestPermission}>
            Enable
          </Button>
        )}
      </div>
      <Alert>
        <AlertTitle className="text-xs">Push delivery isn&apos;t fully wired up yet</AlertTitle>
        <AlertDescription className="text-xs">
          Emergency alerts already appear live on this dashboard (10s refresh) and via SMS/call to
          the on-call number. Background push notifications (alerts while this tab is closed) need
          a Firebase project — coming once that&apos;s provisioned.
        </AlertDescription>
      </Alert>
    </div>
  );
}
