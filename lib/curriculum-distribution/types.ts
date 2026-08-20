export type CurriculumOption = { id: string; name: string };
export type CurriculumLesson = { id: string; text: string; unit: string | null; lesson: string | null };
export type CurriculumWeek = { id: string; sequence: number; lessons: CurriculumLesson[] };
export type CurriculumDistribution = {
  stage: CurriculumOption;
  track: CurriculumOption | null;
  grade: CurriculumOption;
  semester: CurriculumOption;
  subject: CurriculumOption & { isExtra: boolean };
  weeks: CurriculumWeek[];
};
