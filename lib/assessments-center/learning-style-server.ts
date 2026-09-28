import crypto from "node:crypto";

import { callDeepSeekChat } from "@/lib/ai/deepseek-client";
import { LEARNING_STYLES, type LearningStage, type LearningStyle } from "@/lib/assessments-center/learning-style";

export function createLearningStyleToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function parse(value: string) {
  try {
    return JSON.parse(value.replace(/^```json\s*/i, "").replace(/\s*```$/i, ""));
  } catch {
    return null;
  }
}

export async function classifyLearningStyleBatch(input: {
  grade: string;
  classroom: string;
  stage: LearningStage;
  students: Array<{
    studentKey: string;
    answers: Array<{ questionId: string; question: string; answerId: string; answerText: string }>;
  }>;
}) {
  const content = await callDeepSeekChat({
    temperature: 0,
    maxTokens: 1800,
    responseFormat: "json_object",
    messages: [
      {
        role: "system",
        content: "Return JSON only with students, classroomInterpretation, recommendations. Return exactly one item for every input student, preserve every studentKey exactly once, no extra or missing students. learningStyle must be exactly VISUAL, AUDITORY, READ_WRITE, or KINESTHETIC. Classify only from the ten supplied answers; do not invent scores, facts, or traits; do not calculate percentages.",
      },
      { role: "user", content: JSON.stringify(input) },
    ],
  });
  const result = parse(content) as {
    students?: Array<{ studentKey?: string; learningStyle?: string }>;
    classroomInterpretation?: string;
    recommendations?: string[];
  } | null;
  const expected = input.students.map((student) => student.studentKey);
  const returned = result?.students || [];
  if (
    returned.length !== expected.length ||
    new Set(returned.map((student) => student.studentKey)).size !== expected.length ||
    returned.some((student) =>
      !student.studentKey ||
      !expected.includes(student.studentKey) ||
      !LEARNING_STYLES.includes(student.learningStyle as LearningStyle),
    )
  ) {
    throw new Error("INVALID_LEARNING_STYLE_BATCH");
  }
  return {
    students: returned.map((student) => ({
      studentKey: student.studentKey as string,
      learningStyle: student.learningStyle as LearningStyle,
    })),
    classroomInterpretation: String(result?.classroomInterpretation || "").slice(0, 5000),
    recommendations: Array.isArray(result?.recommendations)
      ? result.recommendations.filter((item) => typeof item === "string").slice(0, 20)
      : [],
  };
}
