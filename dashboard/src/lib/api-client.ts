"use client";

import { createClient } from "@/lib/supabase/client";
import { request } from "@/lib/api-shared";

/** Client Components — reads the session from the browser Supabase client. */
export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return request<T>(path, session?.access_token, init);
}

export { ApiError } from "@/lib/api-shared";
