import { getFamilyByCode } from "@/lib/db";
import { setJoinCookies } from "@/lib/join-cookies";

/**
 * Validates a family code and child name, then sets the unsigned join cookies.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { code?: string; childName?: string };
  const family = body.code ? await getFamilyByCode(body.code) : null;
  if (!family) {
    return Response.json(
      { error: "That code is not in our creek. Try again." },
      { status: 404 },
    );
  }

  const requested = (body.childName ?? "").trim();
  if (!requested) {
    return Response.json({
      childName: family.child_name,
      children: [family.child_name],
    });
  }

  const matches = requested.toLowerCase() === family.child_name.toLowerCase();
  if (!matches) {
    return Response.json(
      { error: "Pick the name your grown-up used." },
      { status: 400 },
    );
  }

  await setJoinCookies(family.id, family.child_name);
  return Response.json({
    familyId: family.id,
    childName: family.child_name,
  });
}
