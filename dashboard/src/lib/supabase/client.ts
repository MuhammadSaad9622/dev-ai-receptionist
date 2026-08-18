import { createBrowserClient } from "@supabase/ssr";

// Used from client components — session lives in cookies, refreshed by
// middleware.ts on every request.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
