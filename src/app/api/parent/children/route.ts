import { createChildForFamily } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "You must be logged in." }, { status: 401 });

  const body = (await request.json()) as { name?: string; age?: number };
  const name = (body.name ?? "").trim();
  const age = Number(body.age);
  if (name.length < 1 || name.length > 60) return Response.json({ error: "Enter a child name." }, { status: 400 });
  if (!Number.isInteger(age) || age < 2 || age > 18) return Response.json({ error: "Age must be between 2 and 18." }, { status: 400 });

  const { data: family, error } = await supabase.from("families").select("id").eq("parent_user_id", auth.user.id).maybeSingle();
  if (error) return Response.json({ error: "Could not load your family." }, { status: 500 });
  if (!family) return Response.json({ error: "Connect your family before adding children." }, { status: 409 });

  const child = await createChildForFamily({ familyId: family.id as string, name, age });
  return Response.json({ child });
}
