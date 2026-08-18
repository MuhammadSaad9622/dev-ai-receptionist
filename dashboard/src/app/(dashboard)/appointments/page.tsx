import { apiServer } from "@/lib/api-server";
import type { Appointment } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { AppointmentStatusBadge } from "@/components/status-badge";
import { formatDateTime, formatPhone } from "@/lib/format";
import { MapPin, Wrench } from "lucide-react";

export default async function AppointmentsPage() {
  const appointments = await apiServer<Appointment[]>("/appointments");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Appointments</h1>
        <p className="text-sm text-muted-foreground">
          Booked jobs, synced from your calendar/CRM.
        </p>
      </div>

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No appointments booked yet.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {appointments.map((apt) => (
            <Card key={apt.id}>
              <CardContent className="flex flex-col gap-2 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {apt.customer.name || formatPhone(apt.customer.phone)}
                  </p>
                  <AppointmentStatusBadge status={apt.status} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{formatDateTime(apt.scheduledStart)}</span>
                  {apt.jobType && (
                    <span className="flex items-center gap-1">
                      <Wrench className="h-3 w-3" />
                      {apt.jobType}
                    </span>
                  )}
                  {apt.customer.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {apt.customer.address}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
