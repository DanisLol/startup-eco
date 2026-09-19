import { cookies } from "next/headers";

export const FAMILY_COOKIE = "familyId";
export const CHILD_COOKIE = "childName";

/**
 * Reads the unsigned family join cookies. Not a real auth mechanism.
 */
export async function getJoinCookies(): Promise<{
  familyId: string | null;
  childName: string | null;
}> {
  const store = await cookies();
  return {
    familyId: store.get(FAMILY_COOKIE)?.value ?? null,
    childName: store.get(CHILD_COOKIE)?.value ?? null,
  };
}

/**
 * Stores the unsigned join cookies on the outgoing response.
 */
export async function setJoinCookies(
  familyId: string,
  childName: string,
): Promise<void> {
  const store = await cookies();
  const options = {
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
    sameSite: "lax" as const,
  };
  store.set(FAMILY_COOKIE, familyId, options);
  store.set(CHILD_COOKIE, childName, options);
}
