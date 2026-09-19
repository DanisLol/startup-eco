export function getSupabaseUrl(): string {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

/**
 * Server-only key resolution. The anon key is preferred; the service-role key
 * is a local fallback because this project currently provisions only that key.
 * Never expose the service-role key through NEXT_PUBLIC_* variables.
 */
export function getSupabaseServerKey(): string {
  return process.env.SUPABASE_ANON_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? "";
}

export function hasSupabaseServerConfig(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseServerKey());
}
