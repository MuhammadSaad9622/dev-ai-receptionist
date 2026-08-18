import { redirect } from "next/navigation";

// Auth is already resolved by middleware.ts by the time this renders —
// this route is just a redirect target, never rendered itself.
export default function RootPage() {
  redirect("/interactions");
}
