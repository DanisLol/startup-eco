import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string };
  if (!body.email) return Response.json({ error: "Email is required." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const origin = new URL(request.url).origin;
  const { error } = await supabase.auth.resetPasswordForEmail(body.email.trim(), { redirectTo: `${origin}/parent/reset` });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}
