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
};

export type Lesson = {
  id: string;
  family_id: string;
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
