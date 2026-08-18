import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Used from Server Components / Server Actions / Route Handlers. Cookie
// writes are swallowed when called from a Server Component render (that's
// expected — middleware.ts is what actually persists refreshed sessions).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — no-op, middleware handles refresh.
          }
        },
      },
    },
  );
}
