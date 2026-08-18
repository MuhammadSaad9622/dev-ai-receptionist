"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";
import { Loader2, MailCheck } from "lucide-react";

// Passwordless magic-link sign-in — no password-reset support burden for a
// small set of owner/technician users, and works fine on a phone.
export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/interactions";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>AI Receptionist</CardTitle>
          <CardDescription>Sign in to your owner dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          {status === "sent" ? (
            <Alert>
              <MailCheck className="h-4 w-4" />
              <AlertTitle>Check your email</AlertTitle>
              <AlertDescription>
                We sent a sign-in link to {email}. Open it on this device to continue.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@yourbusiness.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {status === "error" && error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={status === "sending"} className="gap-2">
                {status === "sending" && <Loader2 className="h-4 w-4 animate-spin" />}
                Send sign-in link
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
