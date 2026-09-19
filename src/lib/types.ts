export type Step =
  | { id: string; type: "explain"; title: string; paragraphs: string[] }
  | {
      id: string;
      type: "quiz";
      question: string;
      choices: string[];
      correctIndex: number;
      explanation: string;
    }
  | { id: string; type: "reflect"; prompt: string };

export type LessonArtifact = {
  lessonTitle: string;
  steps: Step[];
  wrapUp: string;
};

export type Progress = {
  completed: string[];
  answers: Record<string, { choice: number; correct: boolean }>;
  reflection: string;
};

export type LessonStatus = "generating" | "ready" | "failed";

export type Family = {
  id: string;
  phone: string;
  code: string;
  child_name: string;
  child_age: number;
  created_at: string;
  parent_user_id?: string | null;
};

export type Child = {
  id: string;
  family_id: string;
  name: string;
  age: number;
  created_at: string;
};

export type ActivitySummary = {
  description: string;
  learned: string[];
};

export type ChildSummary = Child & {
  currentTopic: string | null;
  sessionsCompleted: number;
  stepsCompleted: number;
  stepsTotal: number;
  latestActivityAt: string | null;
};

export type Lesson = {
  id: string;
  family_id: string;
  child_id?: string | null;
  topic: string;
  status: LessonStatus;
  roadmap: string[] | null;
  artifact: LessonArtifact | null;
  created_at: string;
};

export type Session = {
  id: string;
  lesson_id: string;
  progress: Progress;
  started_at: string;
  ended_at: string | null;
  debrief: string | null;
};

export type LessonStats = {
  childName: string;
  lessonTitle: string;
  stepsCompleted: number;
  stepsTotal: number;
  quizzesCorrect: number;
  quizzesAttempted: number;
  minutesElapsed: number;
  completedTitles: string[];
  reflection: string;
  stoppedEarly: boolean;
};

export type ParentUpdate = {
  id: string;
  family_id: string;
  session_id: string;
  lesson_id: string;
  message_body: string;
  observed_stats: LessonStats;
  suggested_next_steps: string[];
  sms_status: "pending" | "sent" | "failed" | "skipped";
  sms_sent_at: string | null;
  sms_error: string | null;
  created_at: string;
};

export type ParentHomeData = {
  family: Family;
  children: ChildSummary[];
};

export type DashboardData = {
  family: Family;
  child: Child;
  lesson: Lesson | null;
  sessions: Array<{
    session: Session;
    lesson: Lesson;
    stats: LessonStats;
    activity: ActivitySummary;
  }>;
  updates: ParentUpdate[];
};
