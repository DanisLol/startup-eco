import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/** Per-request client that acts as the signed-in parent; RLS applies. */
export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component; the proxy refreshes sessions instead.
        }
      },
    },
  });
}

let service: SupabaseClient | null = null;

/**
 * Service-role client for background jobs and server-side writes that RLS
 * intentionally blocks for end users (events, mastery, jobs). Never expose
 * to the browser and always verify ownership before using it on a request.
 */
export function createServiceClient(): SupabaseClient {
  if (!service) {
    service = createSupabaseClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return service;
}
