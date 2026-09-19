import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  if (!body.email || !body.password) return Response.json({ error: "Email and password are required." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email: body.email.trim(), password: body.password });
  if (error) return Response.json({ error: "That email or password was not recognized." }, { status: 401 });
  return Response.json({ ok: true });
}
