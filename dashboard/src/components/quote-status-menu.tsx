"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiClient } from "@/lib/api-client";
import type { QuoteStatus } from "@/lib/types";

const ACTIONS: { status: QuoteStatus; label: string }[] = [
  { status: "WON", label: "Mark won" },
  { status: "LOST", label: "Mark lost" },
];

// Marking WON/LOST cancels the rest of that quote's follow-up sequence
// server-side (see backend QuotesService.updateStatus) — no point nudging a
// customer who already answered.
export function QuoteStatusMenu({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function updateStatus(status: QuoteStatus) {
    startTransition(async () => {
      try {
        await apiClient(`/quotes/${quoteId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        toast.success(`Quote marked ${status.toLowerCase()}`);
        router.refresh();
      } catch {
        toast.error("Couldn't update the quote — try again.");
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" disabled={isPending} />}>
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {ACTIONS.map((action) => (
          <DropdownMenuItem key={action.status} onClick={() => updateStatus(action.status)}>
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
