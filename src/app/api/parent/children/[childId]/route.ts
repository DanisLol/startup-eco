import { deleteChildForFamily } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE(_request: Request, context: { params: Promise<{ childId: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "You must be logged in." }, { status: 401 });

  const { childId } = await context.params;
  const { data: family, error } = await supabase.from("families").select("id").eq("parent_user_id", auth.user.id).maybeSingle();
  if (error) return Response.json({ error: "Could not load your family." }, { status: 500 });
  if (!family) return Response.json({ error: "Family not found." }, { status: 404 });

  const deleted = await deleteChildForFamily({ familyId: family.id as string, childId });
  if (!deleted) return Response.json({ error: "Child not found." }, { status: 404 });
  return Response.json({ ok: true });
}
