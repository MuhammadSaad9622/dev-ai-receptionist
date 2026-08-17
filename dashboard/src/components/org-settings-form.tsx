"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import type { OrganizationSettings } from "@/lib/types";

// Plain controlled form (no react-hook-form) — five fields, no nested
// validation worth the extra dependency for v1.
export function OrgSettingsForm({ settings }: { settings: OrganizationSettings }) {
  const [form, setForm] = useState({
    emergencyAckTimeoutSeconds: settings.emergencyAckTimeoutSeconds,
    quoteFollowUpOffsetsDays: settings.quoteFollowUpOffsetsDays.join(", "),
    quoteExpiresAfterDays: settings.quoteExpiresAfterDays,
    retentionCadenceMonths: settings.retentionCadenceMonths,
    recordingDisclosureScript: settings.recordingDisclosureScript,
  });
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const offsets = form.quoteFollowUpOffsetsDays
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));

    startTransition(async () => {
      try {
        await apiClient("/organization/settings", {
          method: "PATCH",
          body: JSON.stringify({
            emergencyAckTimeoutSeconds: form.emergencyAckTimeoutSeconds,
            quoteFollowUpOffsetsDays: offsets,
            quoteExpiresAfterDays: form.quoteExpiresAfterDays,
            retentionCadenceMonths: form.retentionCadenceMonths,
            recordingDisclosureScript: form.recordingDisclosureScript,
          }),
        });
        toast.success("Settings saved.");
      } catch {
        toast.error("Couldn't save settings — try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Triage & follow-up</CardTitle>
          <CardDescription>
            Drives the emergency escalation timer, quote follow-up cadence, and retention outreach.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ackTimeout">Emergency ack timeout (seconds)</Label>
              <Input
                id="ackTimeout"
                type="number"
                min={30}
                value={form.emergencyAckTimeoutSeconds}
                onChange={(e) =>
                  setForm((f) => ({ ...f, emergencyAckTimeoutSeconds: Number(e.target.value) }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="quoteExpires">Quote expires after (days)</Label>
              <Input
                id="quoteExpires"
                type="number"
                min={1}
                value={form.quoteExpiresAfterDays}
                onChange={(e) =>
                  setForm((f) => ({ ...f, quoteExpiresAfterDays: Number(e.target.value) }))
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="offsets">Quote follow-up days (comma-separated)</Label>
            <Input
              id="offsets"
              placeholder="2, 5, 10"
              value={form.quoteFollowUpOffsetsDays}
              onChange={(e) => setForm((f) => ({ ...f, quoteFollowUpOffsetsDays: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="retention">Retention cadence (months since last job)</Label>
            <Input
              id="retention"
              type="number"
              min={1}
              className="max-w-[160px]"
              value={form.retentionCadenceMonths}
              onChange={(e) =>
                setForm((f) => ({ ...f, retentionCadenceMonths: Number(e.target.value) }))
              }
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="disclosure">Call recording disclosure script</Label>
            <Textarea
              id="disclosure"
              rows={2}
              value={form.recordingDisclosureScript}
              onChange={(e) =>
                setForm((f) => ({ ...f, recordingDisclosureScript: e.target.value }))
              }
            />
          </div>

          <Button type="submit" disabled={isPending} className="w-fit">
            Save changes
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
