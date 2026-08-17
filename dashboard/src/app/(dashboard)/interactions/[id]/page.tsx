import Link from "next/link";
import { ArrowLeft, Phone, MessageSquare, ShieldCheck, ShieldAlert } from "lucide-react";
import { apiServer } from "@/lib/api-server";
import { TriageBadge } from "@/components/triage-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDateTime, formatPhone } from "@/lib/format";
import type { Interaction, Quote, Appointment, EmergencyAlert } from "@/lib/types";

type InteractionDetail = Interaction & {
  quote: Quote | null;
  appointment: Appointment | null;
  emergencyAlert: EmergencyAlert | null;
};

type Params = Promise<{ id: string }>;

export default async function InteractionDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const interaction = await apiServer<InteractionDetail>(`/interactions/${id}`);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <Link
        href="/interactions"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to interactions
      </Link>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            {interaction.channel === "VOICE" ? (
              <Phone className="h-5 w-5 text-muted-foreground" />
            ) : (
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <CardTitle className="text-base">
                {interaction.customer?.name || formatPhone(interaction.fromNumber)}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {formatPhone(interaction.fromNumber)} · {formatDateTime(interaction.createdAt)}
              </p>
            </div>
          </div>
          <TriageBadge category={interaction.triageCategory} />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {interaction.triageReasoning && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Triage reasoning</p>
              <p className="text-sm">{interaction.triageReasoning}</p>
            </div>
          )}

          {interaction.channel === "VOICE" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {interaction.recordingConsentGiven ? (
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
              )}
              {interaction.recordingConsentGiven === null
                ? "Recording consent not yet recorded"
                : interaction.recordingConsentGiven
                  ? "Recording consent given"
                  : "Recording consent declined"}
              {interaction.durationSeconds != null &&
                ` · ${Math.round(interaction.durationSeconds / 60)} min`}
            </div>
          )}

          {interaction.recordingUrl && (
            <audio controls className="w-full" src={interaction.recordingUrl} />
          )}

          {interaction.transcript && (
            <>
              <Separator />
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Transcript</p>
                <p className="whitespace-pre-wrap text-sm text-foreground/90">
                  {interaction.transcript}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {interaction.quote && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Linked quote</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/quotes" className="text-sm text-primary hover:underline">
              {interaction.quote.description}
            </Link>
          </CardContent>
        </Card>
      )}

      {interaction.appointment && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Linked appointment</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/appointments" className="text-sm text-primary hover:underline">
              {interaction.appointment.jobType} — {formatDateTime(interaction.appointment.scheduledStart)}
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
