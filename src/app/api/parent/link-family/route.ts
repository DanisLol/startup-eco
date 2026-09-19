import { createSupabaseServerClient } from "@/lib/supabase/server";
import { linkFamilyToParent } from "@/lib/db";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "You must be logged in." }, { status: 401 });

  const body = (await request.json()) as { code?: string; phone?: string };
  const code = (body.code ?? "").trim();
  const phone = (body.phone ?? "").trim();
  if (!code || !phone) return Response.json({ error: "Family code and phone are required." }, { status: 400 });

  const family = await linkFamilyToParent({ familyCode: code, phone, parentUserId: auth.user.id });
  if (!family) return Response.json({ error: "That code and phone number could not be verified." }, { status: 403 });
  return Response.json({ ok: true });
}
