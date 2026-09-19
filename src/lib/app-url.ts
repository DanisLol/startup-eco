/**
 * Reads the incoming request's public origin from Host / forwarded headers.
 */
export function requestOrigin(request?: Request): string | null {
  if (!request) return null;
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : null;
}

/**
 * Public URL used in parent texts. Prefers APP_URL (ngrok / production).
 */
export function publicAppUrl(request?: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  return requestOrigin(request) ?? "http://localhost:3000";
}

/**
 * Origin used to kick off generation on this same server.
 */
export function generateOrigin(request?: Request): string {
  return requestOrigin(request) ?? publicAppUrl(request);
}
