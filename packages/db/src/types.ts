/**
 * Row types for the tables in supabase/migrations. Hand-maintained for the
 * MVP; replace with `supabase gen types` output once a project is linked.
 */

export type Tier = "free" | "paid";

export interface ParentRow {
  id: string;
  email: string | null;
  tier: Tier;
  timezone: string;
  created_at: string;
}

export interface ChildRow {
  id: string;
  parent_id: string;
  display_name: string;
  age: number | null;
  reading_level: "pre_reader" | "early" | "developing" | "fluent" | "advanced" | null;
  avatar: string;
  created_at: string;
}

export interface PersonalizationRow {
  id: string;
  child_id: string;
  kind: "interest" | "preference" | "note";
  value: string;
  active: boolean;
  created_at: string;
}

export interface CurriculumRow {
  id: string;
  child_id: string;
  goal_text: string;
  title: string;
  description: string;
  status: "generating" | "ready" | "failed";
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface TopicRow {
  id: string;
  curriculum_id: string;
  slug: string;
  title: string;
  description: string;
  position: number;
  difficulty: number;
  prerequisites: string[];
  created_at: string;
}

export interface ObjectiveRow {
  id: string;
  topic_id: string;
  code: string;
  text: string;
  position: number;
}

export interface ArtifactRow {
  id: string;
  topic_id: string;
  version: number;
  status: "generating" | "published" | "failed";
  blueprint: unknown | null;
  html: string | null;
  used_fallback: boolean;
  provider: string | null;
  model: string | null;
  prompt_version: string | null;
  validation_report: unknown | null;
  error: string | null;
  created_at: string;
  published_at: string | null;
}

export interface SessionRow {
  id: string;
  child_id: string;
  topic_id: string;
  artifact_id: string;
  nonce: string;
  started_at: string;
  last_event_at: string | null;
  ended_at: string | null;
}

export interface LearningEventRow {
  id: number;
  session_id: string;
  child_id: string;
  topic_id: string;
  artifact_id: string;
  client_event_id: string;
  type: string;
  section_id: string | null;
  activity_id: string | null;
  payload: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
}

export interface ResponseRow {
  id: number;
  session_id: string;
  child_id: string;
  topic_id: string;
  artifact_id: string;
  activity_id: string;
  activity_type: string;
  question_id: string;
  question_kind: string;
  difficulty: number;
  objective_codes: string[];
  answer: unknown;
  correct: boolean;
  attempt: number;
  hints_used: number;
  occurred_at: string;
}

export interface ObjectiveMasteryRow {
  child_id: string;
  objective_id: string;
  score: number;
  evidence_count: number;
  activity_types: string[];
  status: "unknown" | "developing" | "proficient" | "mastered";
  last_evidence_at: string | null;
}

export interface TopicProgressRow {
  child_id: string;
  topic_id: string;
  status: "not_started" | "in_progress" | "needs_review" | "completed";
  mastery: number;
  reached_end: boolean;
  weak_objective_codes: string[];
  first_activity_at: string | null;
  last_activity_at: string | null;
  completed_at: string | null;
}

export type JobKind = "curriculum" | "artifact" | "daily_report";

export interface GenerationJobRow {
  id: string;
  kind: JobKind;
  payload: Record<string, unknown>;
  status: "queued" | "running" | "done" | "failed";
  attempts: number;
  max_attempts: number;
  error: string | null;
  usage: unknown | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  run_after: string;
}

export interface DailyReportRow {
  id: string;
  child_id: string;
  report_date: string;
  stats: Record<string, unknown>;
  summary: string;
  created_at: string;
}
