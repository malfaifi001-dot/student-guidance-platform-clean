"use client";

import { useState } from "react";
import {
  SAUDI_SCHOOL_GRADES,
  SAUDI_SCHOOL_SECTIONS,
  getSaudiSchoolGrade,
} from "@/lib/timetable/catalog/saudi-school-grades";
import { getSubjectsForGrade } from "@/lib/timetable/catalog/saudi-school-subjects";
import { TimetableTeacherConstraints } from "./timetable-teacher-constraints";
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
  "قيود المعلمين",
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
      <header className="rounded-3xl border border-slate-200 bg-white p-5">
        <a
          href="/dashboard/principal/timetable"
          className="text-sm font-black text-sky-700"
        >
          العودة إلى الجداول
        </a>

        <h1 className="mt-3 text-2xl font-black text-slate-950">
          {project.name}
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          {project.academicYear} — {project.semester}
        </p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => {
              setTab(item);
              setMessage("");
            }}
            className={[
              "rounded-xl px-4 py-2 text-sm font-black",
              tab === item
                ? "bg-sky-700 text-white"
                : "border border-slate-200 bg-white text-slate-600",
            ].join(" ")}
          >
            {item}
          </button>
        ))}
      </nav>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
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
            busy={busy}
            create={create}
            remove={remove}
          />
        ) : null}

        {tab === "المواد" ? (
          <SubjectsPanel
            items={project.subjects}
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

        {tab === "قيود المعلمين" ? (
          <TimetableTeacherConstraints
            projectId={project.id}
            teachers={project.teachers}
            days={normalizeDays(project.daysJson)}
            periods={normalizePeriods(project.periodsJson)}
            onSaved={reload}
          />
        ) : null}

        {tab === "فحص البيانات" ? (
          <TimetableValidationPanel
            projectId={project.id}
          />
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

        {message ? (
          <p className="mt-4 text-sm font-bold text-sky-700">
            {message}
          </p>
        ) : null}
      </section>
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
          subtitle: `${item.specialty || "بدون تخصص"} — النصاب ${item.maxWeeklyLoad}`,
        }))}
        onRemove={(id) => remove("teachers", id)}
      />
    </Panel>
  );
}

function ClassesPanel({
  items,
  busy,
  create,
  remove,
}: {
  items: ClassItem[];
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
          label="الشعبة"
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
          هذا الصف والشعبة مضافان مسبقًا.
        </p>
      ) : null}

      <SimpleList
        items={items.map((item) => ({
          id: item.id,
          title: item.name,
        }))}
        onRemove={(id) => remove("classes", id)}
      />
    </Panel>
  );
}

function SubjectsPanel({
  items,
  busy,
  create,
  remove,
}: {
  items: Subject[];
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
          subtitle: `${item.weeklyLessons} حصص أسبوعيًا`,
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
      <div className="grid gap-3 md:grid-cols-5">
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
          subtitle: `${item.class.name} — ${item.assignedLessons} حصص`,
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
      <h2 className="text-lg font-black text-slate-950">
        {title}
      </h2>

      <div className="mt-4">{children}</div>
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
    <label className="grid gap-2 text-sm font-bold">
      <span>{label}</span>

      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-slate-200 px-3 py-2.5"
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
    <label className="grid gap-2 text-sm font-bold">
      <span>{label}</span>

      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) =>
          onChange(Number(event.target.value))
        }
        className="rounded-xl border border-slate-200 px-3 py-2.5"
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
    <label className="grid gap-2 text-sm font-bold">
      <span>{label}</span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-slate-200 px-3 py-2.5"
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
      className="self-end rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40"
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
  }>;
  onRemove: (id: string) => Promise<void>;
}) {
  if (!items.length) {
    return (
      <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
        لا توجد بيانات مضافة.
      </p>
    );
  }

  return (
    <div className="mt-5 space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
        >
          <div>
            <p className="font-black text-slate-900">
              {item.title}
            </p>

            {item.subtitle ? (
              <p className="mt-1 text-sm text-slate-500">
                {item.subtitle}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => void onRemove(item.id)}
            className="text-sm font-black text-rose-600"
          >
            حذف
          </button>
        </div>
      ))}
    </div>
  );
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
