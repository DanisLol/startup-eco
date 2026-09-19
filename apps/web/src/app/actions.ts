"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PersonalizationKind, ReadingLevel } from "@eco/contracts";
import { requireUser } from "@/lib/auth";
import { enqueueJob, ensureArtifact, kickJob } from "@/lib/jobs";
import { buildDailyReport, todayIso } from "@/lib/report";
import { createClient } from "@/lib/supabase/server";

const ACTIVE_CHILD_COOKIE = "eco_active_child";

/* ---------------- children ---------------- */

const ChildInput = z.object({
  display_name: z.string().trim().min(1).max(40),
  age: z.coerce.number().int().min(3).max(18).nullable(),
  reading_level: ReadingLevel.nullable(),
  avatar: z.string().max(8).default("🙂"),
});

export async function createChild(formData: FormData) {
  const user = await requireUser();
  const input = ChildInput.parse({
    display_name: formData.get("display_name"),
    age: formData.get("age") ? formData.get("age") : null,
    reading_level: formData.get("reading_level") || null,
    avatar: formData.get("avatar") || "🙂",
  });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("children")
    .insert({ ...input, parent_id: user.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/parent");
  redirect(`/parent/children/${data.id}`);
}

export async function addContext(childId: string, formData: FormData) {
  await requireUser();
  const kind = PersonalizationKind.parse(formData.get("kind") ?? "interest");
  const value = z.string().trim().min(1).max(200).parse(formData.get("value"));
  const supabase = await createClient();
  const { error } = await supabase.from("personalization_context").insert({ child_id: childId, kind, value });
  if (error) throw new Error(error.message);
  revalidatePath(`/parent/children/${childId}`);
}

export async function removeContext(childId: string, id: string) {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("personalization_context").update({ active: false }).eq("id", id);
  revalidatePath(`/parent/children/${childId}`);
}

/* ---------------- curriculum ---------------- */

export async function createCurriculum(childId: string, formData: FormData) {
  await requireUser();
  const goal = z.string().trim().min(5).max(600).parse(formData.get("goal"));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("curricula")
    .insert({ child_id: childId, goal_text: goal, title: "Preparing your curriculum…" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const jobId = await enqueueJob({ kind: "curriculum", curriculumId: data.id });
  kickJob(jobId);
  redirect(`/parent/curricula/${data.id}`);
}

export async function regenerateArtifact(topicId: string, curriculumId: string) {
  await requireUser();
  // Ownership: RLS-scoped read must succeed before the service-role write.
  const supabase = await createClient();
  const { data: topic } = await supabase.from("topics").select("id").eq("id", topicId).maybeSingle();
  if (!topic) throw new Error("topic not found");
  await ensureArtifact(topicId, { regenerate: true });
  revalidatePath(`/parent/curricula/${curriculumId}`);
}

export async function retryCurriculum(curriculumId: string) {
  await requireUser();
  const supabase = await createClient();
  const { data: cur } = await supabase.from("curricula").select("id").eq("id", curriculumId).maybeSingle();
  if (!cur) throw new Error("curriculum not found");
  await supabase.from("curricula").update({ status: "generating", error: null }).eq("id", curriculumId);
  const jobId = await enqueueJob({ kind: "curriculum", curriculumId });
  kickJob(jobId);
  revalidatePath(`/parent/curricula/${curriculumId}`);
}

/* ---------------- reports ---------------- */

export async function generateReportNow(childId: string, date?: string) {
  await requireUser();
  const supabase = await createClient();
  const { data: child } = await supabase.from("children").select("id").eq("id", childId).maybeSingle();
  if (!child) throw new Error("child not found");
  await buildDailyReport(childId, date ?? todayIso());
  revalidatePath(`/parent/children/${childId}/report`);
}

/* ---------------- child mode ---------------- */

export async function enterChildMode(childId: string) {
  await requireUser();
  const supabase = await createClient();
  const { data: child } = await supabase.from("children").select("id").eq("id", childId).maybeSingle();
  if (!child) throw new Error("child not found");
  const store = await cookies();
  store.set(ACTIVE_CHILD_COOKIE, childId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
  redirect(`/learn/${childId}`);
}

export async function exitChildMode() {
  const store = await cookies();
  store.delete(ACTIVE_CHILD_COOKIE);
  redirect("/parent");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
