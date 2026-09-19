import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { makeFamilyCode, normalizeFamilyCode } from "./code";
import {
  FIXTURE_CHILD_AGE,
  FIXTURE_CHILD_NAME,
  FIXTURE_FAMILY_CODE,
  FIXTURE_ROADMAP,
  FIXTURE_TOPIC,
  fixtureArtifact,
} from "./fixture";
import { mergeProgress, normalizeProgress } from "./stats";
import type {
  Family,
  Lesson,
  LessonArtifact,
  LessonStatus,
  Progress,
  Session,
  ParentUpdate,
  Child,
} from "./types";

type LessonRow = Omit<Lesson, "artifact" | "roadmap" | "status"> & {
  status: string;
  roadmap: unknown;
  artifact: unknown;
};

type SessionRow = Omit<Session, "progress"> & { progress: unknown };

type MemoryStore = {
  families: Map<string, Family>;
  lessons: Map<string, Lesson>;
  sessions: Map<string, Session>;
  updates: Map<string, ParentUpdate>;
  seeded: boolean;
};

const globalStore = globalThis as typeof globalThis & {
  pebbleMemory?: MemoryStore;
};

/**
 * Returns the process-wide in-memory store, surviving Next.js HMR reloads.
 */
function memoryStore(): MemoryStore {
  if (!globalStore.pebbleMemory) {
    globalStore.pebbleMemory = {
      families: new Map(),
      lessons: new Map(),
      sessions: new Map(),
      updates: new Map(),
      seeded: false,
    };
  }
  return globalStore.pebbleMemory;
}

/**
 * Returns true when Supabase env vars are present.
 */
export function hasDatabase(): boolean {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/**
 * Creates a service-role Supabase client. Returns null in local demo mode.
 */
function supabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Seeds the in-memory store with the volcano fixture so /join works without env vars.
 */
function seedMemory(): void {
  if (memoryStore().seeded) return;
  memoryStore().seeded = true;
  const family: Family = {
    id: "00000000-0000-4000-a000-000000000001",
    phone: "+15555550107",
    code: FIXTURE_FAMILY_CODE,
    child_name: FIXTURE_CHILD_NAME,
    child_age: FIXTURE_CHILD_AGE,
    created_at: new Date().toISOString(),
  };
  const lesson: Lesson = {
    id: "00000000-0000-4000-a000-000000000002",
    family_id: family.id,
    topic: FIXTURE_TOPIC,
    status: "ready",
    roadmap: FIXTURE_ROADMAP,
    artifact: fixtureArtifact,
    created_at: new Date().toISOString(),
  };
  memoryStore().families.set(family.id, family);
  memoryStore().lessons.set(lesson.id, lesson);
}

function mapLesson(row: LessonRow): Lesson {
  const status: LessonStatus =
    row.status === "ready" || row.status === "failed" ? row.status : "generating";
  return {
    ...row,
    status,
    roadmap: Array.isArray(row.roadmap)
      ? row.roadmap.filter((item): item is string => typeof item === "string")
      : null,
    artifact:
      row.artifact && typeof row.artifact === "object"
        ? (row.artifact as LessonArtifact)
        : null,
  };
}

function mapSession(row: SessionRow): Session {
  return {
    ...row,
    progress: normalizeProgress(row.progress),
  };
}

/**
 * Finds a family by E.164 phone number.
 */
export async function getFamilyByPhone(phone: string): Promise<Family | null> {
  const db = supabase();
  if (!db) {
    seedMemory();
    return (
      [...memoryStore().families.values()].find((family) => family.phone === phone) ??
      null
    );
  }
  const { data, error } = await db
    .from("families")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();
  if (error) throw error;
  return data as Family | null;
}

/**
 * Finds a family by the 6-character join code.
 */
export async function getFamilyByCode(code: string): Promise<Family | null> {
  const normalized = normalizeFamilyCode(code);
  const db = supabase();
  if (!db) {
    seedMemory();
    return (
      [...memoryStore().families.values()].find((family) => family.code === normalized) ??
      null
    );
  }
  const { data, error } = await db
    .from("families")
    .select("*")
    .eq("code", normalized)
    .maybeSingle();
  if (error) throw error;
  return data as Family | null;
}

/**
 * Loads a family by id.
 */
export async function getFamilyById(id: string): Promise<Family | null> {
  const db = supabase();
  if (!db) {
    seedMemory();
    return memoryStore().families.get(id) ?? null;
  }
  const { data, error } = await db
    .from("families")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Family | null;
}

/**
 * Inserts a family, retrying if the generated code collides.
 */
async function insertFamily(input: {
  phone: string;
  childName: string;
  childAge: number;
}): Promise<Family> {
  const db = supabase();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = makeFamilyCode();
    if (!db) {
      seedMemory();
      const family: Family = {
        id: crypto.randomUUID(),
        phone: input.phone,
        code,
        child_name: input.childName,
        child_age: input.childAge,
        created_at: new Date().toISOString(),
      };
      memoryStore().families.set(family.id, family);
      return family;
    }
    const { data, error } = await db
      .from("families")
      .insert({
        phone: input.phone,
        code,
        child_name: input.childName,
        child_age: input.childAge,
      })
      .select("*")
      .single();
    if (!error && data) return data as Family;
    if (error && !error.message.toLowerCase().includes("duplicate")) throw error;
  }
  throw new Error("Could not create a unique family code");
}

/**
 * Creates or reuses a family from an inbound SMS, then inserts a generating lesson.
 */
export async function createFamilyAndLesson(
  phone: string,
  parsed: { childName: string; age: number; topic: string },
): Promise<{ family: Family; lessonId: string }> {
  let family = await getFamilyByPhone(phone);
  if (!family) {
    family = await insertFamily({
      phone,
      childName: parsed.childName,
      childAge: parsed.age,
    });
  }

  const db = supabase();
  if (!db) {
    const lesson: Lesson = {
      id: crypto.randomUUID(),
      family_id: family.id,
      child_id: null,
      topic: parsed.topic,
      status: "generating",
      roadmap: null,
      artifact: null,
      created_at: new Date().toISOString(),
    };
    memoryStore().lessons.set(lesson.id, lesson);
    return { family, lessonId: lesson.id };
  }

  const { data: primaryChild, error: childError } = await db
    .from("children")
    .select("id")
    .eq("family_id", family.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (childError) throw childError;

  const { data, error } = await db
    .from("lessons")
    .insert({
      family_id: family.id,
      child_id: primaryChild?.id ?? null,
      topic: parsed.topic,
      status: "generating",
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("Lesson insert failed");
  return { family, lessonId: data.id as string };
}

/**
 * Loads a lesson by id.
 */
export async function getLesson(id: string): Promise<Lesson | null> {
  const db = supabase();
  if (!db) {
    seedMemory();
    return memoryStore().lessons.get(id) ?? null;
  }
  const { data, error } = await db
    .from("lessons")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapLesson(data as LessonRow) : null;
}

/**
 * Returns the newest lesson for a family.
 */
export async function getLatestLessonForFamily(
  familyId: string,
): Promise<Lesson | null> {
  const db = supabase();
  if (!db) {
    seedMemory();
    const lessons = [...memoryStore().lessons.values()]
      .filter((lesson) => lesson.family_id === familyId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return lessons[0] ?? null;
  }
  const { data, error } = await db
    .from("lessons")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapLesson(data as LessonRow) : null;
}

/**
 * Writes a generated artifact (or a failed status) onto a lesson.
 */
export async function updateLessonGeneration(
  lessonId: string,
  update:
    | { status: "ready"; artifact: LessonArtifact; roadmap: string[] }
    | { status: "failed" },
): Promise<void> {
  const db = supabase();
  if (!db) {
    const lesson = memoryStore().lessons.get(lessonId);
    if (!lesson) return;
    if (update.status === "ready") {
      memoryStore().lessons.set(lessonId, {
        ...lesson,
        status: "ready",
        artifact: update.artifact,
        roadmap: update.roadmap,
      });
      return;
    }
    memoryStore().lessons.set(lessonId, { ...lesson, status: "failed" });
    return;
  }

  const payload =
    update.status === "ready"
      ? {
          status: "ready",
          artifact: update.artifact,
          roadmap: update.roadmap,
        }
      : { status: "failed" };

  const { error } = await db.from("lessons").update(payload).eq("id", lessonId);
  if (error) throw error;
}

/**
 * Opens an in-progress session or creates a new one.
 */
export async function openOrResumeSession(lessonId: string): Promise<Session> {
  const db = supabase();
  if (!db) {
    const existing = [...memoryStore().sessions.values()].find(
      (session) => session.lesson_id === lessonId && !session.ended_at,
    );
    if (existing) return existing;
    const session: Session = {
      id: crypto.randomUUID(),
      lesson_id: lessonId,
      progress: normalizeProgress(null),
      started_at: new Date().toISOString(),
      ended_at: null,
      debrief: null,
    };
    memoryStore().sessions.set(session.id, session);
    return session;
  }

  const { data: open, error: openError } = await db
    .from("sessions")
    .select("*")
    .eq("lesson_id", lessonId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (openError) throw openError;
  if (open) return mapSession(open as SessionRow);

  const { data, error } = await db
    .from("sessions")
    .insert({ lesson_id: lessonId })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Session insert failed");
  return mapSession(data as SessionRow);
}

/**
 * Loads a session by id.
 */
export async function getSession(id: string): Promise<Session | null> {
  const db = supabase();
  if (!db) return memoryStore().sessions.get(id) ?? null;
  const { data, error } = await db
    .from("sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSession(data as SessionRow) : null;
}

/**
 * Merges a step event into the session progress JSONB.
 */
export async function saveProgress(input: {
  sessionId: string;
  stepId: string;
  answer?: { choice: number; correct: boolean };
  reflection?: string;
}): Promise<Progress | null> {
  const session = await getSession(input.sessionId);
  if (!session) return null;
  const progress = mergeProgress(session.progress, input.stepId, {
    answer: input.answer,
    reflection: input.reflection,
  });

  const db = supabase();
  if (!db) {
    memoryStore().sessions.set(input.sessionId, { ...session, progress });
    return progress;
  }
  const { error } = await db
    .from("sessions")
    .update({ progress })
    .eq("id", input.sessionId);
  if (error) throw error;
  return progress;
}

/**
 * Marks a session finished and optionally stores the debrief SMS body.
 */
export async function closeSession(
  sessionId: string,
  debrief?: string,
): Promise<Session | null> {
  const session = await getSession(sessionId);
  if (!session) return null;
  const endedAt = new Date().toISOString();
  const db = supabase();
  if (!db) {
    const closed: Session = {
      ...session,
      ended_at: endedAt,
      debrief: debrief ?? session.debrief,
    };
    memoryStore().sessions.set(sessionId, closed);
    return closed;
  }
  const { data, error } = await db
    .from("sessions")
    .update({ ended_at: endedAt, debrief: debrief ?? null })
    .eq("id", sessionId)
    .select("*")
    .single();
  if (error) throw error;
  return data ? mapSession(data as SessionRow) : null;
}

/**
 * Returns the most recently finished session for a family, for the /done page.
 */
export async function getLatestEndedSessionForFamily(
  familyId: string,
): Promise<{ session: Session; lesson: Lesson } | null> {
  const db = supabase();
  if (!db) {
    const lessonIds = [...memoryStore().lessons.values()]
      .filter((lesson) => lesson.family_id === familyId)
      .map((lesson) => lesson.id);
    const session = [...memoryStore().sessions.values()]
      .filter(
        (item) => lessonIds.includes(item.lesson_id) && Boolean(item.ended_at),
      )
      .sort((a, b) => (b.ended_at ?? "").localeCompare(a.ended_at ?? ""))[0];
    if (!session) return null;
    const lesson = memoryStore().lessons.get(session.lesson_id);
    if (!lesson) return null;
    return { session, lesson };
  }

  const { data: lessons, error: lessonError } = await db
    .from("lessons")
    .select("id")
    .eq("family_id", familyId);
  if (lessonError) throw lessonError;
  const ids = (lessons ?? []).map((row) => row.id as string);
  if (ids.length === 0) return null;

  const { data, error } = await db
    .from("sessions")
    .select("*")
    .in("lesson_id", ids)
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const session = mapSession(data as SessionRow);
  const lesson = await getLesson(session.lesson_id);
  if (!lesson) return null;
  return { session, lesson };
}

/** Creates a child profile under a family after the caller has authorized it. */
export async function createChildForFamily(input: { familyId: string; name: string; age: number }): Promise<Child> {
  const child: Child = {
    id: crypto.randomUUID(),
    family_id: input.familyId,
    name: input.name.trim(),
    age: input.age,
    created_at: new Date().toISOString(),
  };
  const db = supabase();
  if (!db) return child;
  const { data, error } = await db.from("children").insert({ family_id: child.family_id, name: child.name, age: child.age }).select("*").single();
  if (error || !data) throw error ?? new Error("Child creation failed");
  return data as Child;
}

/** Deletes a child only within the already-authorized family. */
export async function deleteChildForFamily(input: { familyId: string; childId: string }): Promise<boolean> {
  const db = supabase();
  if (!db) return false;
  const { error, count } = await db
    .from("children")
    .delete({ count: "exact" })
    .eq("id", input.childId)
    .eq("family_id", input.familyId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Links a signed-in parent to the family identified by both phone and code. */
export async function linkFamilyToParent(input: {
  familyCode: string;
  phone: string;
  parentUserId: string;
}): Promise<Family | null> {
  const family = await getFamilyByCode(input.familyCode);
  if (!family || family.phone !== input.phone) return null;
  if (family.parent_user_id && family.parent_user_id !== input.parentUserId) {
    return null;
  }

  const db = supabase();
  if (!db) {
    const linked = { ...family, parent_user_id: input.parentUserId };
    memoryStore().families.set(family.id, linked);
    return linked;
  }

  const { data, error } = await db
    .from("families")
    .update({ parent_user_id: input.parentUserId })
    .eq("id", family.id)
    .is("parent_user_id", null)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as Family | null) ?? (family.parent_user_id === input.parentUserId ? family : null);
}

/** Stores one canonical parent message, safe to retry for the same session. */
export async function createParentUpdate(input: Omit<ParentUpdate, "id" | "created_at" | "sms_status" | "sms_sent_at" | "sms_error">): Promise<ParentUpdate> {
  const db = supabase();
  const existing = await getParentUpdateForSession(input.session_id);
  if (existing) return existing;

  const update: ParentUpdate = {
    ...input,
    id: crypto.randomUUID(),
    sms_status: "pending",
    sms_sent_at: null,
    sms_error: null,
    created_at: new Date().toISOString(),
  };
  if (!db) {
    memoryStore().updates.set(update.id, update);
    return update;
  }

  const { data, error } = await db
    .from("parent_updates")
    .insert({
      family_id: update.family_id,
      session_id: update.session_id,
      lesson_id: update.lesson_id,
      message_body: update.message_body,
      observed_stats: update.observed_stats,
      suggested_next_steps: update.suggested_next_steps,
      sms_status: update.sms_status,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") {
      const duplicate = await getParentUpdateForSession(input.session_id);
      if (duplicate) return duplicate;
    }
    throw error;
  }
  return data as ParentUpdate;
}

export async function getParentUpdateForSession(sessionId: string): Promise<ParentUpdate | null> {
  const db = supabase();
  if (!db) {
    return [...memoryStore().updates.values()].find((item) => item.session_id === sessionId) ?? null;
  }
  const { data, error } = await db
    .from("parent_updates")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data as ParentUpdate | null;
}

export async function updateParentSmsStatus(input: {
  updateId: string;
  status: ParentUpdate["sms_status"];
  error?: string;
}): Promise<void> {
  const sentAt = input.status === "sent" ? new Date().toISOString() : null;
  const db = supabase();
  if (!db) {
    const update = [...memoryStore().updates.values()].find((item) => item.id === input.updateId);
    if (update) {
      memoryStore().updates.set(update.id, { ...update, sms_status: input.status, sms_sent_at: sentAt, sms_error: input.error ?? null });
    }
    return;
  }
  const { error } = await db
    .from("parent_updates")
    .update({ sms_status: input.status, sms_sent_at: sentAt, sms_error: input.error ?? null })
    .eq("id", input.updateId);
  if (error) throw error;
}
