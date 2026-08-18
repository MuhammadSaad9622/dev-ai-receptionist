"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Phone, PhoneCall, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiClient } from "@/lib/api-client";
import type { AvailableNumber, Organization } from "@/lib/types";

type Props = {
  twilioPhoneNumber: Organization["twilioPhoneNumber"];
  telephonyIntegration: Organization["telephonyIntegration"];
};

// Three setup phases, driven entirely by what the org row already has —
// each business connects and pays for their own Twilio account (their own
// number, their own usage credits), never ours. No provider name shown
// anywhere here per the product's white-labeling.
export function PhoneNumberSetup({ twilioPhoneNumber, telephonyIntegration }: Props) {
  if (telephonyIntegration?.status === "NUMBER_CONNECTED" && twilioPhoneNumber) {
    return <ConnectedState phoneNumber={twilioPhoneNumber} />;
  }
  if (twilioPhoneNumber) {
    return <ConnectVoiceStep />;
  }
  if (telephonyIntegration) {
    return <NumberSearchStep />;
  }
  return <ConnectAccountStep />;
}

function ConnectedState({ phoneNumber }: { phoneNumber: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      <span className="font-medium">{phoneNumber}</span>
      <span className="text-muted-foreground">is live and taking calls/texts.</span>
    </div>
  );
}

function ConnectAccountStep() {
  const router = useRouter();
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await apiClient("/organization/telephony", {
          method: "PATCH",
          body: JSON.stringify({ accountSid, authToken }),
        });
        toast.success("Account connected.");
        router.refresh();
      } catch {
        toast.error("Couldn't connect — check your Account SID and Auth Token.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Connect your phone service account. You&apos;ll purchase and pay for your own number next.
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="accountSid">Account SID</Label>
        <Input
          id="accountSid"
          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          value={accountSid}
          onChange={(e) => setAccountSid(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="authToken">Auth Token</Label>
        <Input
          id="authToken"
          type="password"
          value={authToken}
          onChange={(e) => setAuthToken(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={isPending} className="w-fit gap-2">
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Connect
      </Button>
    </form>
  );
}

function NumberSearchStep() {
  const router = useRouter();
  const [areaCode, setAreaCode] = useState("");
  const [results, setResults] = useState<AvailableNumber[] | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [isPurchasing, startPurchase] = useTransition();

  function search(e: React.FormEvent) {
    e.preventDefault();
    startSearch(async () => {
      try {
        const query = areaCode ? `?areaCode=${encodeURIComponent(areaCode)}` : "";
        const numbers = await apiClient<AvailableNumber[]>(`/organization/telephony/numbers${query}`);
        setResults(numbers);
        if (numbers.length === 0) toast.info("No numbers found — try a different area code.");
      } catch {
        toast.error("Couldn't search numbers — check your account connection.");
      }
    });
  }

  function purchase(phoneNumber: string) {
    startPurchase(async () => {
      try {
        await apiClient("/organization/telephony/numbers", {
          method: "POST",
          body: JSON.stringify({ phoneNumber }),
        });
        toast.success(`${phoneNumber} purchased.`);
        router.refresh();
      } catch {
        toast.error("Couldn't complete the purchase — try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Search for a number to buy. This charges your own account&apos;s balance, not ours.
      </p>
      <form onSubmit={search} className="flex gap-2">
        <Input
          placeholder="Area code (optional)"
          value={areaCode}
          onChange={(e) => setAreaCode(e.target.value)}
          className="max-w-[180px]"
        />
        <Button type="submit" variant="outline" disabled={isSearching} className="gap-2">
          {isSearching && <Loader2 className="h-4 w-4 animate-spin" />}
          Search
        </Button>
      </form>

      {results && (
        <div className="flex flex-col gap-2">
          {results.map((n) => (
            <div key={n.phoneNumber} className="flex items-center justify-between gap-2 rounded-lg border p-3">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{n.phoneNumber}</span>
                {(n.locality || n.region) && (
                  <span className="text-xs text-muted-foreground">
                    {[n.locality, n.region].filter(Boolean).join(", ")}
                  </span>
                )}
              </div>
              <AlertDialog>
                <AlertDialogTrigger render={<Button size="sm" disabled={isPurchasing} />}>
                  Buy
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Purchase {n.phoneNumber}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This charges your connected account&apos;s balance (plus your carrier&apos;s standard
                      monthly + usage rates). This can&apos;t be undone from here.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => purchase(n.phoneNumber)}>
                      Purchase
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConnectVoiceStep() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function connect() {
    startTransition(async () => {
      try {
        await apiClient("/organization/telephony/connect-voice", { method: "POST" });
        toast.success("Your number is live.");
        router.refresh();
      } catch {
        toast.error("Couldn't connect this number — try again shortly.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Number purchased. One more step to make it answer calls and texts.
      </p>
      <Button onClick={connect} disabled={isPending} className="w-fit gap-2">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
        Activate this number
      </Button>
    </div>
  );
}
