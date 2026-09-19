import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { ParentRow } from "@eco/db";
import { createClient } from "@/lib/supabase/server";

export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export async function getParent(userId: string): Promise<ParentRow> {
  const supabase = await createClient();
  const { data } = await supabase.from("parents").select("*").eq("id", userId).maybeSingle();
  if (data) return data as ParentRow;
  // The trigger creates this row on signup; tolerate a race on first request.
  return { id: userId, email: null, tier: "free", timezone: "UTC", created_at: new Date().toISOString() };
}
