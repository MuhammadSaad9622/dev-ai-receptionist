import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// NOTE: this must be named `config` (not `proxyConfig`) even in proxy.ts —
// Next.js 16.3.1 renamed the file/function (middleware.ts/middleware() ->
// proxy.ts/proxy()) but kept reading the matcher from a const literally
// named `config`. Getting this wrong doesn't error; it silently makes the
// matcher a no-op, so proxy runs on every request including
// _next/static/* chunks, which then get redirected to /login and load as
// HTML instead of JS. Verified against node_modules/next/dist/docs/01-app/
// 03-api-reference/03-file-conventions/proxy.md in the installed version.
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (static assets)
     * - favicon.ico
     * - public asset extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
