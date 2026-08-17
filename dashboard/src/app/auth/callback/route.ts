import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase's PKCE magic-link flow lands here with `?code=...` — exchange it
// for a session (sets the auth cookies) and continue to wherever the user
// was headed before /login.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/interactions";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
