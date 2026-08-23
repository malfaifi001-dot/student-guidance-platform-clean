import { getCurriculumCalendarItems } from "@/lib/curriculum-distribution/calendar";
import type { CurriculumDistribution } from "@/lib/curriculum-distribution/types";
import type { PortfolioCurriculumContent } from "@/lib/portfolio/service-outputs/service-output-types";

function clean(value: string | null | undefined) {
  return String(value || "").replace(/(?:->|<-)/g, " · ").trim();
}

export function normalizeCurriculumDistribution(distribution: CurriculumDistribution): PortfolioCurriculumContent {
  return {
    kind: "curriculum-distribution",
    subject: distribution.subject.name,
    stage: distribution.stage.name,
    track: distribution.track?.name || "",
    grade: distribution.grade.name,
    semester: distribution.semester.name,
    weeks: getCurriculumCalendarItems(distribution.weeks).map((item) => {
      const grouped = new Map<string, string[]>();
      const standalone: string[] = [];
      for (const lesson of item.lessons) {
        const lessonText = clean(lesson.lesson) || clean(lesson.text) || "درس غير محدد";
        const unit = clean(lesson.unit);
        if (!unit) standalone.push(lessonText);
        else grouped.set(unit, [...(grouped.get(unit) || []), lessonText]);
      }
      return {
        id: item.id,
        kind: item.kind,
        sequence: item.sequence,
        title: item.title,
        hijriRange: item.hijriRange,
        gregorianRange: item.gregorianRange,
        units: [...grouped.entries()].map(([name, lessons]) => ({ name, lessons })),
        standalone,
      };
    }),
  };
}

