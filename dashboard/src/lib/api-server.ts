// Deliberately no `import "server-only"` guard package here (would need an
// extra dependency) — the real safety comes from api-client.ts being the
// only module client components import; this file pulls in next/headers
// via supabase/server and must never be imported from a "use client" file.
import { createClient } from "@/lib/supabase/server";
import { request } from "@/lib/api-shared";

/** Server Components / Server Actions / Route Handlers — reads the session
 * from cookies. Kept in its own module (separate from api-client.ts) so
 * client components never transitively pull in `next/headers`. */
export async function apiServer<T>(path: string, init?: RequestInit): Promise<T> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return request<T>(path, session?.access_token, init);
}

export { ApiError } from "@/lib/api-shared";
