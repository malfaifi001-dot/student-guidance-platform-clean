"use client";

import { useState } from "react";
import {
  BookOpen,
  GraduationCap,
  Link2,
  Trash2,
  UserRound,
  Waypoints,
} from "lucide-react";
import { SmartFeedbackModal } from "@/components/service-ui/smart-feedback-modal";
import {
  TimetableDataCard,
  TimetableEmptyState,
  type TimetableCardMetric,
  type TimetableCardTone,
} from "@/components/timetable/timetable-data-card";
import {
  SAUDI_SCHOOL_GRADES,
  SAUDI_SCHOOL_SECTIONS,
  getSaudiSchoolGrade,
} from "@/lib/timetable/catalog/saudi-school-grades";
import { getSubjectsForGrade } from "@/lib/timetable/catalog/saudi-school-subjects";
import { TimetableConstraintsCenter } from "./timetable-constraints-center";
import { TimetableAdvancedConstraintsPanel } from "./timetable-advanced-constraints-panel";
import { TimetableAiAnalysisPanel } from "./timetable-ai-analysis-panel";
import { TimetableValidationPanel } from "./timetable-validation-panel";
import { TimetableGenerationPanel } from "./timetable-generation-panel";

type Teacher = {
  id: string;
  name: string;
  specialty?: string | null;
  maxWeeklyLoad: number;
  unavailableSlotsJson?: unknown;
};

type ClassItem = {
  id: string;
  name: string;
};

type Subject = {
  id: string;
  name: string;
  catalogKey?: string | null;
};

type ClassSubject = {
  id: string;
  classId: string;
  subjectId: string;
  weeklyLessons: number;
  class: ClassItem;
  subject: Subject;
};

type Assignment = {
  id: string;
  assignedLessons: number;
  singlePeriods: number;
  doublePeriods: number;
  teacher: Teacher;
  class: ClassItem;
  subject: Subject;
};

type ProjectData = {
  id: string;
  name: string;
  academicYear: string;
  semester: string;
  daysJson: unknown;
  periodsJson: unknown;
  teachers: Teacher[];
  classes: ClassItem[];
  subjects: Subject[];
  classSubjects: ClassSubject[];
  assignments: Assignment[];
};

const tabs = [
  "المعلمون",
  "الفصول",
  "المواد",
  "مواد الفصول",
  "العلاقات التدريسية",
  "القيود",
  "فحص البيانات",
  "إنشاء الجدول",
] as const;

export function TimetableDataEditor({
  initialProject,
}: {
  initialProject: ProjectData;
}) {
  const [project, setProject] = useState(initialProject);
  const [tab, setTab] =
    useState<(typeof tabs)[number]>("المعلمون");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    const response = await fetch(
      `/api/dashboard/principal/timetable/projects/${project.id}/data`,
      {
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (response.ok) {
      setProject(result.project);
    }
  }

  async function create(
    resource: string,
    data: Record<string, unknown>,
  ) {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/dashboard/principal/timetable/projects/${project.id}/resources`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resource,
            data,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "تعذر حفظ البيانات.");
        return false;
      }

      await reload();
      setMessage("تم حفظ البيانات.");
      return true;
    } catch {
      setMessage("تعذر الاتصال بالخادم. حاول مرة أخرى.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function remove(resource: string, id: string) {
    setBusy(true);
    setMessage("");

    const response = await fetch(
      `/api/dashboard/principal/timetable/projects/${project.id}/resources?resource=${resource}&id=${id}`,
      {
        method: "DELETE",
      },
    );

    const result = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(result.error || "تعذر الحذف.");
      return;
    }

    await reload();
    setMessage("تم الحذف.");
  }

  return (
    <main className="space-y-5" dir="rtl">
      <header className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-sky-900 to-sky-600 p-8 text-white shadow-xl">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <a
              href="/dashboard/principal/timetable"
              className="inline-flex rounded-2xl bg-white/15 px-3 py-1.5 text-xs font-black text-white transition hover:bg-white/25"
            >
              العودة إلى الجداول
            </a>

            <p className="mt-4 text-xs font-black text-sky-100">
              مشروع الجدول الدراسي
            </p>

            <h1 className="mt-1 text-4xl font-black text-white">
              {project.name}
            </h1>

            <p className="mt-2 text-sm font-bold text-sky-100">
              {project.academicYear} — {project.semester}
            </p>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <span className="rounded-2xl bg-white/15 px-4 py-3 text-center">
              <span className="block text-lg font-black">
                {project.teachers.length}
              </span>
              <span className="text-[11px] font-bold text-sky-100">
                معلم
              </span>
              </span>

              <span className="rounded-2xl bg-white/15 px-4 py-3 text-center">
              <span className="block text-lg font-black">
                {project.classes.length}
              </span>
              <span className="text-[11px] font-bold text-sky-100">
                فصل
              </span>
              </span>

              <span className="rounded-2xl bg-white/15 px-4 py-3 text-center">
              <span className="block text-lg font-black">
                {project.subjects.length}
              </span>
              <span className="text-[11px] font-bold text-sky-100">
                مادة
              </span>
              </span>

              <span className="rounded-2xl bg-white/15 px-4 py-3 text-center">
              <span className="block text-lg font-black">
                {project.assignments.length}
              </span>
              <span className="text-[11px] font-bold text-sky-100">
                إسناد
              </span>
              </span>
            </div>

            <a
              href={`/dashboard/principal/timetable/${project.id}/operations`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-sky-900 shadow-sm transition hover:bg-sky-50 sm:w-auto"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-sky-100 text-sky-800">
                ◷
              </span>
              التشغيل اليومي للغياب والانتظار
            </a>
          </div>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2 rounded-[1.75rem] border border-slate-200 bg-white/95 p-2 shadow-sm">
        {tabs.map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => {
              setTab(item);
              setMessage("");
            }}
            className={[
              "rounded-full px-4 py-2.5 text-sm font-black transition",
              tab === item
                ? "bg-slate-950 text-white shadow-md"
                : "border border-transparent bg-transparent text-slate-600 hover:bg-sky-50 hover:text-sky-700",
            ].join(" ")}
          >
            {item}
          </button>
        ))}
      </nav>

      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        {tab === "المعلمون" ? (
          <TeachersPanel
            items={project.teachers}
            busy={busy}
            create={create}
            remove={remove}
          />
        ) : null}

        {tab === "الفصول" ? (
          <ClassesPanel
            items={project.classes}
            classSubjects={project.classSubjects}
            assignments={project.assignments}
            busy={busy}
            create={create}
            remove={remove}
          />
        ) : null}

        {tab === "المواد" ? (
          <SubjectsPanel
            items={project.subjects}
            classSubjects={project.classSubjects}
            busy={busy}
            create={create}
            remove={remove}
          />
        ) : null}

        {tab === "مواد الفصول" ? (
          <ClassSubjectsPanel
            items={project.classSubjects}
            classes={project.classes}
            subjects={project.subjects}
            busy={busy}
            create={create}
            remove={remove}
          />
        ) : null}

        {tab === "العلاقات التدريسية" ? (
          <AssignmentsPanel
            items={project.assignments}
            teachers={project.teachers}
            classSubjects={project.classSubjects}
            busy={busy}
            create={create}
            remove={remove}
          />
        ) : null}

        {tab === "القيود" ? (
          <TimetableConstraintsCenter
            projectId={project.id}
            teachers={project.teachers}
            classes={project.classes}
            subjects={project.subjects}
            days={normalizeDays(project.daysJson)}
            periods={normalizePeriods(project.periodsJson)}
          />
        ) : null}

        {tab === "فحص البيانات" ? (
          <>
  <TimetableValidationPanel
    projectId={project.id}
  />

  <TimetableAiAnalysisPanel
    projectId={project.id}
  />
</>
        ) : null}

        {tab === "إنشاء الجدول" ? (
          <TimetableGenerationPanel
            projectId={project.id}
            days={normalizeDays(project.daysJson)}
            periods={normalizePeriods(project.periodsJson)}
            classes={project.classes}
            teachers={project.teachers}
          />
        ) : null}

      </section>

      <SmartFeedbackModal
        open={Boolean(message)}
        type={message.startsWith("تم") ? "success" : "error"}
        title={message.startsWith("تم") ? "تمت العملية" : "تعذر إكمال العملية"}
        description={message}
        primaryActionLabel="حسنًا"
        onOpenChange={(open) => {
          if (!open) setMessage("");
        }}
      />
    </main>
  );
}

function TeachersPanel({
  items,
  busy,
  create,
  remove,
}: {
  items: Teacher[];
  busy: boolean;
  create: (
    resource: string,
    data: Record<string, unknown>,
  ) => Promise<boolean>;
  remove: (resource: string, id: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [maxWeeklyLoad, setMaxWeeklyLoad] = useState(24);

  async function submit() {
    const success = await create("teachers", {
      name,
      specialty: specialty || null,
      maxWeeklyLoad,
      isActive: true,
      unavailableSlots: [],
    });

    if (success) {
      setName("");
      setSpecialty("");
      setMaxWeeklyLoad(24);
    }
  }

  return (
    <Panel title="المعلمون">
      <div className="grid gap-3 md:grid-cols-4">
        <Input
          label="اسم المعلم"
          value={name}
          onChange={setName}
        />

        <Input
          label="التخصص"
          value={specialty}
          onChange={setSpecialty}
        />

        <NumberInput
          label="النصاب الأسبوعي"
          value={maxWeeklyLoad}
          onChange={setMaxWeeklyLoad}
        />

        <SaveButton
          busy={busy}
          disabled={!name.trim()}
          onClick={submit}
        />
      </div>

      <SimpleList
        items={items.map((item) => ({
          id: item.id,
          title: item.name,
          subtitle: item.specialty || "بدون تخصص",
          icon: <UserRound className="h-5 w-5" />,
          tone: "sky" as const,
          badges: ["معلم"],
          metrics: [
            { label: "النصاب الأسبوعي", value: `${item.maxWeeklyLoad} حصة` },
            {
              label: "قيود عدم التوفر",
              value: `${countUnavailableSlots(item.unavailableSlotsJson)} قيد`,
            },
          ],
        }))}
        onRemove={(id) => remove("teachers", id)}
      />
    </Panel>
  );
}

function ClassesPanel({
  items,
  classSubjects,
  assignments,
  busy,
  create,
  remove,
}: {
  items: ClassItem[];
  classSubjects: ClassSubject[];
  assignments: Assignment[];
  busy: boolean;
  create: (
    resource: string,
    data: Record<string, unknown>,
  ) => Promise<boolean>;
  remove: (resource: string, id: string) => Promise<void>;
}) {
  const [gradeKey, setGradeKey] = useState(
    SAUDI_SCHOOL_GRADES[0]?.key || "",
  );
  const [section, setSection] = useState<string>(
    SAUDI_SCHOOL_SECTIONS[0],
  );

  const grade = getSaudiSchoolGrade(gradeKey);
  const generatedName = grade
    ? `${grade.label} - ${section}`
    : "";
  const isDuplicate = items.some(
    (item) => item.name.trim() === generatedName,
  );

  async function submit() {
    if (!generatedName || isDuplicate) {
      return;
    }

    const success = await create("classes", {
      name: generatedName,
      isActive: true,
    });

    if (success) {
      setSection(SAUDI_SCHOOL_SECTIONS[0]);
    }
  }

  return (
    <Panel title="الفصول">
      <div className="grid gap-3 md:grid-cols-3">
        <Select
          label="الصف الدراسي"
          value={gradeKey}
          onChange={setGradeKey}
          options={SAUDI_SCHOOL_GRADES.map((item) => ({
            value: item.key,
            label: item.label,
          }))}
        />

        <Select
          label="الصف"
          value={section}
          onChange={setSection}
          options={SAUDI_SCHOOL_SECTIONS.map((item) => ({
            value: item,
            label: item,
          }))}
        />

        <SaveButton
          busy={busy}
          disabled={!generatedName || isDuplicate}
          onClick={submit}
        />
      </div>

      {isDuplicate ? (
        <p className="mt-3 text-sm font-bold text-amber-700">
          هذا الصف مضاف مسبقًا بالرمز نفسه.
        </p>
      ) : null}

      <SimpleList
        items={items.map((item) => ({
          id: item.id,
          title: item.name,
          subtitle: splitClassName(item.name).grade,
          icon: <GraduationCap className="h-5 w-5" />,
          tone: "violet" as const,
          badges: splitClassName(item.name).section
            ? [`الصف ${splitClassName(item.name).section}`]
            : [],
          metrics: [
            {
              label: "المواد المرتبطة",
              value: classSubjects.filter((entry) => entry.classId === item.id).length,
            },
            {
              label: "الإسنادات",
              value: assignments.filter((entry) => entry.class.id === item.id).length,
            },
          ],
        }))}
        onRemove={(id) => remove("classes", id)}
      />
    </Panel>
  );
}

function SubjectsPanel({
  items,
  classSubjects,
  busy,
  create,
  remove,
}: {
  items: Subject[];
  classSubjects: ClassSubject[];
  busy: boolean;
  create: (
    resource: string,
    data: Record<string, unknown>,
  ) => Promise<boolean>;
  remove: (resource: string, id: string) => Promise<void>;
}) {
  const [gradeKey, setGradeKey] = useState(
    SAUDI_SCHOOL_GRADES[0]?.key || "",
  );
  const [query, setQuery] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [customName, setCustomName] = useState("");

  const availableSubjects = getSubjectsForGrade(gradeKey).filter(
    (item) =>
      !query.trim() ||
      item.name.includes(query.trim()),
  );

  function toggleSubject(catalogKey: string) {
    setSelectedKeys((current) =>
      current.includes(catalogKey)
        ? current.filter((key) => key !== catalogKey)
        : [...current, catalogKey],
    );
  }

  async function submit() {
    const catalogSubjects = getSubjectsForGrade(gradeKey).filter(
      (item) => selectedKeys.includes(item.catalogKey),
    );
    const customSubjectName = customName.trim();
    const additions = [
      ...catalogSubjects.map((item) => ({
        name: item.name,
        catalogKey: item.catalogKey,
      })),
      ...(customSubjectName
        ? [{ name: customSubjectName, catalogKey: null }]
        : []),
    ].filter(
      (item) =>
        !items.some(
          (existing) =>
            existing.name.trim() === item.name ||
            (item.catalogKey &&
              existing.catalogKey === item.catalogKey),
        ),
    );

    for (const item of additions) {
      const success = await create("subjects", {
        ...item,
        isActive: true,
      });

      if (!success) {
        return;
      }
    }

    setSelectedKeys([]);
    setCustomName("");
  }

  return (
    <Panel title="المواد">
      <div className="grid gap-3 md:grid-cols-2">
        <Select
          label="الصف الدراسي"
          value={gradeKey}
          onChange={(value) => {
            setGradeKey(value);
            setSelectedKeys([]);
          }}
          options={SAUDI_SCHOOL_GRADES.map((item) => ({
            value: item.key,
            label: item.label,
          }))}
        />

        <Input
          label="البحث في المواد"
          value={query}
          onChange={setQuery}
          placeholder="ابحث باسم المادة"
        />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {availableSubjects.map((item) => {
          const alreadyAdded = items.some(
            (existing) =>
              existing.catalogKey === item.catalogKey ||
              existing.name.trim() === item.name,
          );
          const checked = selectedKeys.includes(item.catalogKey);

          return (
            <label
              key={item.catalogKey}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"
            >
              <input
                type="checkbox"
                checked={checked || alreadyAdded}
                disabled={alreadyAdded || busy}
                onChange={() => toggleSubject(item.catalogKey)}
              />
              <span>{item.name}</span>
              {alreadyAdded ? (
                <span className="mr-auto text-xs text-slate-400">
                  مضافة
                </span>
              ) : null}
            </label>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Input
          label="مادة مخصصة (اختياري)"
          value={customName}
          onChange={setCustomName}
          placeholder="اكتب اسم المادة غير الموجودة في القائمة"
        />

        <SaveButton
          busy={busy}
          disabled={!selectedKeys.length && !customName.trim()}
          onClick={submit}
        />
      </div>

      <SimpleList
        items={items.map((item) => ({
          id: item.id,
          title: item.name,
          subtitle: item.catalogKey ? "مادة من المنهج" : "مادة مخصصة",
          icon: <BookOpen className="h-5 w-5" />,
          tone: "amber" as const,
          badges: item.catalogKey ? ["معتمدة في الدليل"] : ["مخصصة"],
          metrics: [
            {
              label: "الفصول المرتبطة",
              value: new Set(
                classSubjects
                  .filter((entry) => entry.subjectId === item.id)
                  .map((entry) => entry.classId),
              ).size,
            },
            {
              label: "الحصص الأسبوعية",
              value: classSubjects
                .filter((entry) => entry.subjectId === item.id)
                .reduce((total, entry) => total + entry.weeklyLessons, 0),
            },
          ],
        }))}
        onRemove={(id) => remove("subjects", id)}
      />
    </Panel>
  );
}

function ClassSubjectsPanel({
  items,
  classes,
  subjects,
  busy,
  create,
  remove,
}: {
  items: ClassSubject[];
  classes: ClassItem[];
  subjects: Subject[];
  busy: boolean;
  create: (
    resource: string,
    data: Record<string, unknown>,
  ) => Promise<boolean>;
  remove: (resource: string, id: string) => Promise<void>;
}) {
  const [classId, setClassId] = useState(classes[0]?.id || "");
  const [subjectId, setSubjectId] =
    useState(subjects[0]?.id || "");
  const [weeklyLessons, setWeeklyLessons] = useState(1);

  async function submit() {
    await create("class-subjects", {
      classId,
      subjectId,
      weeklyLessons,
    });
  }

  return (
    <Panel title="مواد الفصول">
      <div className="grid gap-3 md:grid-cols-4">
        <Select
          label="الفصل"
          value={classId}
          onChange={setClassId}
          options={classes.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
        />

        <Select
          label="المادة"
          value={subjectId}
          onChange={setSubjectId}
          options={subjects.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
        />

        <NumberInput
          label="الحصص الأسبوعية"
          value={weeklyLessons}
          onChange={setWeeklyLessons}
        />

        <SaveButton
          busy={busy}
          disabled={!classId || !subjectId}
          onClick={submit}
        />
      </div>

      <SimpleList
        items={items.map((item) => ({
          id: item.id,
          title: `${item.class.name} — ${item.subject.name}`,
          subtitle: "ارتباط مادة بفصل",
          icon: <Link2 className="h-5 w-5" />,
          tone: "emerald" as const,
          metrics: [
            { label: "الحصص الأسبوعية", value: `${item.weeklyLessons} حصص` },
            { label: "الفصل", value: item.class.name },
          ],
        }))}
        onRemove={(id) => remove("class-subjects", id)}
      />
    </Panel>
  );
}

function AssignmentsPanel({
  items,
  teachers,
  classSubjects,
  busy,
  create,
  remove,
}: {
  items: Assignment[];
  teachers: Teacher[];
  classSubjects: ClassSubject[];
  busy: boolean;
  create: (
    resource: string,
    data: Record<string, unknown>,
  ) => Promise<boolean>;
  remove: (resource: string, id: string) => Promise<void>;
}) {
  const [teacherId, setTeacherId] =
    useState(teachers[0]?.id || "");
  const [classSubjectId, setClassSubjectId] =
    useState(classSubjects[0]?.id || "");
  const [singlePeriods, setSinglePeriods] = useState(1);
  const [doublePeriods, setDoublePeriods] = useState(0);

  const selected = classSubjects.find(
    (item) => item.id === classSubjectId,
  );

  async function submit() {
    if (!selected) {
      return;
    }

    await create("assignments", {
      teacherId,
      classId: selected.classId,
      subjectId: selected.subjectId,
      assignedLessons:
        singlePeriods + doublePeriods * 2,
      singlePeriods,
      doublePeriods,
      fixedSlots: [],
    });
  }

  return (
    <Panel title="العلاقات التدريسية">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_minmax(280px,2fr)_minmax(140px,0.7fr)_minmax(140px,0.7fr)_minmax(150px,0.8fr)]">
        <Select
          label="المعلم"
          value={teacherId}
          onChange={setTeacherId}
          options={teachers.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
        />

        <Select
          label="الفصل والمادة"
          value={classSubjectId}
          onChange={setClassSubjectId}
          options={classSubjects.map((item) => ({
            value: item.id,
            label: `${item.class.name} — ${item.subject.name}`,
          }))}
        />

        <NumberInput
          label="حصص فردية"
          value={singlePeriods}
          onChange={setSinglePeriods}
        />

        <NumberInput
          label="كتل مزدوجة"
          value={doublePeriods}
          onChange={setDoublePeriods}
        />

        <SaveButton
          busy={busy}
          disabled={!teacherId || !selected}
          onClick={submit}
        />
      </div>

      <p className="mt-3 text-sm text-slate-500">
        الإجمالي: {singlePeriods + doublePeriods * 2} حصة
      </p>

      <SimpleList
        items={items.map((item) => ({
          id: item.id,
          title: `${item.teacher.name} — ${item.subject.name}`,
          subtitle: item.class.name,
          icon: <Waypoints className="h-5 w-5" />,
          tone: "sky" as const,
          badges: [item.subject.name, item.class.name],
          metrics: [
            { label: "إجمالي الحصص", value: item.assignedLessons },
            { label: "حصص فردية", value: item.singlePeriods },
            { label: "كتل مزدوجة", value: item.doublePeriods },
          ],
        }))}
        onRemove={(id) => remove("assignments", id)}
      />
    </Panel>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-50 text-sm font-black text-sky-700">
          ◇
        </span>

        <div>
          <p className="text-[11px] font-black text-sky-700">
            بيانات الجدول
          </p>

          <h2 className="mt-0.5 text-xl font-black text-slate-950">
            {title}
          </h2>
        </div>
      </div>

      <div className="mt-5">{children}</div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-bold">
      <span>{label}</span>

      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
      />
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-bold">
      <span>{label}</span>

      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) =>
          onChange(Number(event.target.value))
        }
        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
  }>;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-bold">
      <span>{label}</span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
      >
        <option value="">اختر</option>

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SaveButton({
  busy,
  disabled,
  onClick,
}: {
  busy: boolean;
  disabled: boolean;
  onClick: () => Promise<void>;
}) {
  return (
    <button
      type="button"
      disabled={busy || disabled}
      onClick={() => void onClick()}
      className="self-end rounded-2xl bg-sky-700 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-sky-800 disabled:opacity-40"
    >
      إضافة
    </button>
  );
}

function SimpleList({
  items,
  onRemove,
}: {
  items: Array<{
    id: string;
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    tone?: TimetableCardTone;
    badges?: React.ReactNode[];
    metrics?: TimetableCardMetric[];
  }>;
  onRemove: (id: string) => Promise<void>;
}) {
  if (!items.length) {
    return (
      <div className="mt-5">
        <TimetableEmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title="لا توجد بيانات مضافة"
          description="ستظهر السجلات هنا بعد إضافتها."
        />
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <TimetableDataCard
          key={item.id}
          icon={item.icon}
          title={item.title}
          description={item.subtitle}
          tone={item.tone}
          badges={item.badges}
          metrics={item.metrics}
          actions={
            <button
              type="button"
              onClick={() => void onRemove(item.id)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              حذف
            </button>
          }
        />
      ))}
    </div>
  );
}

function countUnavailableSlots(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function splitClassName(name: string) {
  const [grade, section = ""] = name.split(/\s*-\s*/);
  return { grade: grade || name, section };
}
function normalizeDays(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      !("id" in item) ||
      !("label" in item)
    ) {
      return [];
    }

    return [{
      id: String(item.id || ""),
      label: String(item.label || ""),
    }];
  });
}

function normalizePeriods(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      !("id" in item) ||
      !("label" in item)
    ) {
      return [];
    }

    return [{
      id: String(item.id || ""),
      label: String(item.label || ""),
      isBreak:
        "isBreak" in item && item.isBreak === true,
    }];
  });
}
