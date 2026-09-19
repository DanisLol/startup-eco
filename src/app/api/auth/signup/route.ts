import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  if (!body.email || !body.password) return Response.json({ error: "Email and password are required." }, { status: 400 });
  if (body.password.length < 8) return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const origin = new URL(request.url).origin;
  const { data, error } = await supabase.auth.signUp({ email: body.email.trim(), password: body.password, options: { emailRedirectTo: `${origin}/auth/callback` } });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true, needsConfirmation: !data.session });
}
