require("dotenv/config");
const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not defined; Prisma reads .env for this importer.");
const url = new URL(databaseUrl); url.searchParams.set("prepareCacheLength", "0");
const prisma = new PrismaClient({ adapter: new PrismaMariaDb(url.toString()) });
const input = path.resolve(process.cwd(), "data/imports/curriculum/tahdiri-full-complete.json");
const source = JSON.parse(fs.readFileSync(input, "utf8"));
const counts = { stages: 0, tracks: 0, grades: 0, semesters: 0, subjects: 0, weeks: 0, lessons: 0, skipped: 0 };
const clean = (value) => value == null ? "" : String(value).trim();
const key = (...parts) => parts.map(clean).join(":").replace(/[^\p{L}\p{N}:_-]/gu, "_").slice(0, 180);
const warn = (message) => { counts.skipped++; console.warn(`[curriculum] skipped: ${message}`); };
const topStageOrder = { primary: 10, middle: 20, secondary: 30, continuousEducation: 40, specialEducation: 50 };
const specialStageOrder = { "0": 10, "1": 20, "2": 30, "3": 40 };

async function upsertStage(sourceKey, name, parentId, sortOrder) { if (!name) return null; counts.stages++; return prisma.curriculumStage.upsert({ where: { sourceKey }, update: { name, parentId: parentId || null, sortOrder: sortOrder || 0 }, create: { sourceKey, name, parentId: parentId || null, sortOrder: sortOrder || 0 } }); }
async function upsertTrack(sourceKey, name, stageId) { if (!name) return null; counts.tracks++; return prisma.curriculumTrack.upsert({ where: { sourceKey }, update: { name, stageId }, create: { sourceKey, name, stageId } }); }
async function processGrade(stage, track, grade, gradeKey) {
  const gradeName = clean(grade.title || grade.name || (track && track.title));
  const term = grade.term || (track && track.term);
  if (!gradeName || !term) return warn(`grade without title/term at ${gradeKey}`);
  counts.grades++;
  const record = await prisma.curriculumGrade.upsert({ where: { sourceKey: gradeKey }, update: { name: gradeName, stageId: stage.id, trackId: track ? track.id : null }, create: { sourceKey: gradeKey, name: gradeName, stageId: stage.id, trackId: track ? track.id : null } });
  const semesters = term.semesters && typeof term.semesters === "object" ? Object.entries(term.semesters) : [];
  for (const [semesterKey, semester] of semesters) {
    if (!semester || typeof semester !== "object") return warn(`invalid semester at ${gradeKey}`);
    const semesterName = clean(semester.title || semester.name || semesterKey); const semesterSourceKey = key(gradeKey, "semester", semesterKey, term.termId);
    if (!semesterName) return warn(`semester without title at ${gradeKey}`);
    counts.semesters++;
    const semesterRecord = await prisma.curriculumSemester.upsert({ where: { sourceKey: semesterSourceKey }, update: { name: semesterName, gradeId: record.id }, create: { sourceKey: semesterSourceKey, name: semesterName, gradeId: record.id } });
    for (const subject of Array.isArray(semester.subjects) ? semester.subjects : []) {
      const subjectName = clean(subject && (subject.title || subject.name)); if (!subjectName) { warn(`subject without title at ${semesterSourceKey}`); continue; }
      const subjectSourceKey = key(semesterSourceKey, "subject", subject.id ?? subjectName);
      counts.subjects++;
      const subjectRecord = await prisma.curriculumSubject.upsert({ where: { sourceKey: subjectSourceKey }, update: { name: subjectName, isExtra: Boolean(subject.isExtra), semesterId: semesterRecord.id }, create: { sourceKey: subjectSourceKey, name: subjectName, isExtra: Boolean(subject.isExtra), semesterId: semesterRecord.id } });
      for (const week of Array.isArray(subject.distribution) ? subject.distribution : []) {
        const sequence = Number(week && (week.index ?? week.sequence)); if (!Number.isInteger(sequence) || sequence < 0) { warn(`invalid week at ${subjectSourceKey}`); continue; }
        const weekSourceKey = key(subjectSourceKey, "week", sequence); counts.weeks++;
        const weekRecord = await prisma.curriculumWeek.upsert({ where: { sourceKey: weekSourceKey }, update: { sequence, subjectId: subjectRecord.id }, create: { sourceKey: weekSourceKey, sequence, subjectId: subjectRecord.id } });
        for (const [lessonIndex, lesson] of (Array.isArray(week.lessons) ? week.lessons : []).entries()) {
          const text = clean(lesson && (lesson.text || lesson.lesson)); if (!text) { warn(`lesson without text at ${weekSourceKey}`); continue; }
          counts.lessons++; const lessonSourceKey = key(weekSourceKey, "lesson", lessonIndex);
          await prisma.curriculumLesson.upsert({ where: { sourceKey: lessonSourceKey }, update: { text, unit: clean(lesson.unit) || null, lesson: clean(lesson.lesson) || null, weekId: weekRecord.id }, create: { sourceKey: lessonSourceKey, text, unit: clean(lesson.unit) || null, lesson: clean(lesson.lesson) || null, weekId: weekRecord.id } });
        }
      }
    }
  }
}
async function processStage(stageKey, raw, parentKey = "", parentStage = null) {
  if (!raw || typeof raw !== "object") return;
  const order = parentStage ? (specialStageOrder[stageKey] || 0) : (topStageOrder[stageKey] || 0);
  const stage = await upsertStage(key("stage", parentKey, stageKey, raw.id), clean(raw.title || raw.name || stageKey), parentStage && parentStage.id, order); if (!stage) return;
  const tracks = raw.tracks && typeof raw.tracks === "object" ? Object.entries(raw.tracks) : [];
  if (tracks.length) for (const [trackKey, trackRaw] of tracks) { const track = await upsertTrack(key(stage.sourceKey, "track", trackKey, trackRaw.id), clean(trackRaw.title || trackRaw.name || trackKey), stage.id); if (!track) { warn(`track without title at ${stageKey}`); continue; } const grades = Array.isArray(trackRaw.grades) && trackRaw.grades.length ? trackRaw.grades : [trackRaw]; for (const [i, grade] of grades.entries()) await processGrade(stage, track, grade, key(track.sourceKey, "grade", grade.id ?? i)); }
  else if (Array.isArray(raw.grades)) for (const [i, grade] of raw.grades.entries()) await processGrade(stage, null, grade, key(stage.sourceKey, "grade", grade.id ?? i));
  if (raw.children && typeof raw.children === "object") {
    for (const [childIndex, grade] of Object.entries(raw.children)) {
      await processGrade(stage, null, grade, key(stage.sourceKey, "grade", grade.id ?? childIndex));
    }
  }
  if (raw.stages && typeof raw.stages === "object") for (const [childKey, child] of Object.entries(raw.stages)) await processStage(childKey, child, stage.sourceKey, stage);
}
(async () => { for (const [stageKey, raw] of Object.entries(source.stages || {})) await processStage(stageKey, raw); console.log("Curriculum import complete:", counts); })().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
