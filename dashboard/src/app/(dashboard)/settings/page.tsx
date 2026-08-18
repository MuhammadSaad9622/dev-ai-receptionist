import { apiServer } from "@/lib/api-server";
import type { Organization } from "@/lib/types";
import { OrgSettingsForm } from "@/components/org-settings-form";
import { VoicePicker } from "@/components/voice-picker";
import { PushPermission } from "@/components/push-permission";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SettingsPage() {
  const org = await apiServer<Organization>("/organization");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">{org.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business</CardTitle>
          <CardDescription>Read-only — contact support to change.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type</span>
            <span>{org.businessType.replace(/_/g, " & ")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phone number</span>
            <span>{org.twilioPhoneNumber ?? "Not provisioned"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">CRM integration</span>
            {org.crmIntegration ? (
              <Badge variant="outline">
                {org.crmIntegration.provider} · {org.crmIntegration.status.toLowerCase()}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Not connected
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Voice</CardTitle>
          <CardDescription>
            Choose the voice callers hear. Preview before picking — changes go live on your agent
            immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VoicePicker selectedVoiceId={org.voiceId} />
        </CardContent>
      </Card>

      {org.settings && <OrgSettingsForm settings={org.settings} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <PushPermission />
        </CardContent>
      </Card>
    </div>
  );
}
