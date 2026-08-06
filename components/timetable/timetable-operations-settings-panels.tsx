"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { Pencil, ShieldCheck, UserRound } from "lucide-react";

import { TimetableDataCard, TimetableEmptyState } from "@/components/timetable/timetable-data-card";

export type WaitingPolicy = {
  candidateCount: number;
  maxDailySubstitutions: number;
  maxWeeklySubstitutions: number;

  allowBeforeFirstLesson: boolean;
  allowAfterLastLesson: boolean;
  allowInsideGap: boolean;
  preferInsideGap: boolean;

  allowOnGoldenDay: boolean;
  goldenDayEmergency: boolean;

  allowAfterLateArrival: boolean;
  excludeLateArrivalDay: boolean;
  allowBeforeEarlyDeparture: boolean;

  preventConsecutiveSubstitutions: boolean;
  preventFirstPeriod: boolean;
  preventLastPeriod: boolean;

  requireMatchingSpecialty: boolean;
  preferMatchingSpecialty: boolean;

  weeklyLoadWeight: number;
  weeklyWaitingWeight: number;
  dailyWaitingWeight: number;
  gapPreferenceWeight: number;
  specialtyWeight: number;
  firstLastFairnessWeight: number;

  settingsJson?: {
    referenceLoad?: number;
    goldenDaysByTeacher?: Record<
      string,
      string[]
    >;
    excludedDaysByTeacher?: Record<
      string,
      string[]
    >;
    excludedPeriodsByTeacher?: Record<
      string,
      string[]
    >;
    priorityByTeacher?: Record<
      string,
      number
    >;
    notesByTeacher?: Record<
      string,
      string
    >;
  };
};

type Teacher = {
  id: string;
  name: string;
  specialty: string | null;
  maxWeeklyLoad: number;
  weeklyLoad: number;
};

type DayItem = {
  id: string;
  label: string;
  order: number;
};

type Period = {
  id: string;
  label: string;
  order: number;
  isBreak?: boolean;
};

type SupervisionAssignment = {
  id: string;
  teacherId: string;
  isPrimary: boolean;
  sortOrder: number;
  teacher: {
    id: string;
    name: string;
    specialty: string | null;
  };
};

export type SupervisionDuty = {
  id: string;
  title: string;
  dutyType: string;
  status: string;
  dayId: string;
  periodId: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  requiredTeachers: number;
  note: string | null;
  assignments: SupervisionAssignment[];
};

type NoticeTone =
  | "success"
  | "error"
  | "info";

export type OperationsWorkspaceSection =
  | "ABSENCE"
  | "POLICY"
  | "TEACHERS"
  | "SUPERVISION";

const defaultPolicy: WaitingPolicy = {
  candidateCount: 6,
  maxDailySubstitutions: 1,
  maxWeeklySubstitutions: 5,

  allowBeforeFirstLesson: false,
  allowAfterLastLesson: false,
  allowInsideGap: true,
  preferInsideGap: true,

  allowOnGoldenDay: false,
  goldenDayEmergency: false,

  allowAfterLateArrival: true,
  excludeLateArrivalDay: false,
  allowBeforeEarlyDeparture: true,

  preventConsecutiveSubstitutions: true,
  preventFirstPeriod: false,
  preventLastPeriod: false,

  requireMatchingSpecialty: false,
  preferMatchingSpecialty: true,

  weeklyLoadWeight: 100,
  weeklyWaitingWeight: 40,
  dailyWaitingWeight: 60,
  gapPreferenceWeight: 20,
  specialtyWeight: 15,
  firstLastFairnessWeight: 10,

  settingsJson: {},
};

export function TimetableOperationsSettingsPanels({
  endpoint,
  policy: initialPolicy,
  teachers,
  days,
  periods,
  supervisionDuties,
  activeSection,
  onSectionChange,
  absenceContent,
  onReload,
  onNotice,
}: {
  endpoint: string;
  policy: WaitingPolicy | null;
  teachers: Teacher[];
  days: DayItem[];
  periods: Period[];
  supervisionDuties: SupervisionDuty[];
  activeSection: OperationsWorkspaceSection;
  onSectionChange: (
    section: OperationsWorkspaceSection,
  ) => void;
  absenceContent: React.ReactNode;
  onReload: () => Promise<void>;
  onNotice: (
    tone: NoticeTone,
    title: string,
    message: string,
  ) => void;
}) {
  const [policy, setPolicy] =
    useState<WaitingPolicy>(
      normalizePolicy(initialPolicy),
    );

  const [saving, setSaving] =
    useState(false);

  const [selectedTeacherId, setSelectedTeacherId] =
    useState(teachers[0]?.id || "");

  const [title, setTitle] = useState("");
  const [dutyType, setDutyType] =
    useState("BREAK");

  const [dayId, setDayId] =
    useState(days[0]?.id || "");

  const [periodId, setPeriodId] =
    useState("");

  const [startTime, setStartTime] =
    useState("");

  const [endTime, setEndTime] =
    useState("");

  const [location, setLocation] =
    useState("");

  const [requiredTeachers, setRequiredTeachers] =
    useState(1);

  const [teacherIds, setTeacherIds] =
    useState<string[]>([]);

  const [supervisionNote, setSupervisionNote] =
    useState("");
  const [editingDutyId, setEditingDutyId] =
    useState<string | null>(null);

  const teachingPeriods = useMemo(
    () =>
      periods
        .filter((period) => !period.isBreak)
        .sort(
          (first, second) =>
            first.order - second.order,
        ),
    [periods],
  );

  const selectedTeacher =
    teachers.find(
      (teacher) =>
        teacher.id === selectedTeacherId,
    ) || teachers[0];

  useEffect(() => {
    setPolicy(
      normalizePolicy(initialPolicy),
    );
  }, [initialPolicy]);

  useEffect(() => {
    if (
      selectedTeacherId &&
      teachers.some(
        (teacher) =>
          teacher.id === selectedTeacherId,
      )
    ) {
      return;
    }

    setSelectedTeacherId(
      teachers[0]?.id || "",
    );
  }, [selectedTeacherId, teachers]);

  function updatePolicy<
    Key extends keyof WaitingPolicy,
  >(
    key: Key,
    value: WaitingPolicy[Key],
  ) {
    setPolicy((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateSettings(
    updater: (
      settings: NonNullable<
        WaitingPolicy["settingsJson"]
      >,
    ) => NonNullable<
      WaitingPolicy["settingsJson"]
    >,
  ) {
    setPolicy((current) => ({
      ...current,
      settingsJson: updater({
        ...(current.settingsJson || {}),
      }),
    }));
  }

  function toggleTeacherSetting(
    field:
      | "goldenDaysByTeacher"
      | "excludedDaysByTeacher"
      | "excludedPeriodsByTeacher",
    teacherId: string,
    value: string,
  ) {
    updateSettings((settings) => {
      const currentMap = {
        ...(settings[field] || {}),
      };

      const currentValues =
        currentMap[teacherId] || [];

      currentMap[teacherId] =
        currentValues.includes(value)
          ? currentValues.filter(
              (item) => item !== value,
            )
          : [...currentValues, value];

      return {
        ...settings,
        [field]: currentMap,
      };
    });
  }

  async function request(
    payload: Record<string, unknown>,
  ) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.error ||
          "تعذر تنفيذ العملية.",
      );
    }

    return result;
  }

  async function savePolicy() {
    setSaving(true);

    try {
      await request({
        action: "SAVE_POLICY",
        data: {
          ...policy,
          settingsJson:
            policy.settingsJson || {},
        },
      });

      await onReload();

      onNotice(
        "success",
        "تم حفظ ضوابط الانتظار",
        "ستُطبق الضوابط المحفوظة على حالات الغياب الجديدة وترشيح المعلمين البدلاء.",
      );
    } catch (error) {
      onNotice(
        "error",
        "تعذر حفظ الضوابط",
        getErrorMessage(error),
      );
    } finally {
      setSaving(false);
    }
  }

  async function createSupervision() {
    if (!title.trim()) {
      onNotice(
        "error",
        "عنوان المناوبة مطلوب",
        "اكتب اسمًا واضحًا للمناوبة أو الإشراف.",
      );
      return;
    }

    if (!dayId) {
      onNotice(
        "error",
        "اليوم مطلوب",
        "اختر اليوم الذي ستنفذ فيه المناوبة.",
      );
      return;
    }

    if (
      teacherIds.length <
      requiredTeachers
    ) {
      onNotice(
        "error",
        "عدد المعلمين غير مكتمل",
        `اختر ${requiredTeachers} معلمًا على الأقل.`,
      );
      return;
    }

    setSaving(true);

    try {
      await request({
        action: editingDutyId ? "UPDATE_SUPERVISION" : "CREATE_SUPERVISION",
        ...(editingDutyId ? { dutyId: editingDutyId } : {}),
        data: {
          title: title.trim(),
          dutyType,
          dayId,
          periodId:
            periodId || undefined,
          startTime:
            startTime || undefined,
          endTime:
            endTime || undefined,
          location:
            location.trim() || undefined,
          requiredTeachers,
          teacherIds,
          note:
            supervisionNote.trim() ||
            undefined,
        },
      });

      setTitle("");
      setPeriodId("");
      setStartTime("");
      setEndTime("");
      setLocation("");
      setRequiredTeachers(1);
      setTeacherIds([]);
      setSupervisionNote("");
      setEditingDutyId(null);

      await onReload();

      onNotice(
        "success",
        editingDutyId ? "تم تعديل المناوبة" : "تم حفظ المناوبة",
        editingDutyId
          ? "حُفظت التعديلات وتكليفات المعلمين المرتبطة بها."
          : "حُفظت المناوبة وربطت بالمعلمين المحددين، وستُستبعد من تعارضات الانتظار.",
      );
    } catch (error) {
      onNotice(
        "error",
        "تعذر حفظ المناوبة",
        getErrorMessage(error),
      );
    } finally {
      setSaving(false);
    }
  }

  function editSupervision(duty: SupervisionDuty) {
    setEditingDutyId(duty.id);
    setTitle(duty.title);
    setDutyType(duty.dutyType);
    setDayId(duty.dayId);
    setPeriodId(duty.periodId || "");
    setStartTime(duty.startTime || "");
    setEndTime(duty.endTime || "");
    setLocation(duty.location || "");
    setRequiredTeachers(duty.requiredTeachers);
    setTeacherIds(duty.assignments.map((assignment) => assignment.teacherId));
    setSupervisionNote(duty.note || "");
  }

  function cancelSupervisionEdit() {
    setEditingDutyId(null);
    setTitle("");
    setPeriodId("");
    setStartTime("");
    setEndTime("");
    setLocation("");
    setRequiredTeachers(1);
    setTeacherIds([]);
    setSupervisionNote("");
  }

  async function deleteSupervision(
    dutyId: string,
  ) {
    setSaving(true);

    try {
      await request({
        action: "DELETE_SUPERVISION",
        dutyId,
      });

      await onReload();

      onNotice(
        "success",
        "تم حذف المناوبة",
        "حُذفت المناوبة وتكليفات المعلمين التابعة لها.",
      );
    } catch (error) {
      onNotice(
        "error",
        "تعذر حذف المناوبة",
        getErrorMessage(error),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      dir="rtl"
      className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm"
    >
      <header className="border-b border-slate-200 bg-slate-50 px-5 py-5 sm:px-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-black text-sky-700">
              مركز التشغيل اليومي
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-950">
              {activeSection === "ABSENCE"
                ? "رصد الغياب وخطة الانتظار"
                : activeSection === "POLICY"
                  ? "ضوابط الانتظار"
                  : activeSection === "TEACHERS"
                    ? "إعدادات المعلمين"
                    : "المناوبات والإشراف"}
            </h2>

            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
              {activeSection === "ABSENCE"
                ? "سجّل الغياب واستعرض الحصص المتأثرة واعتمد المعلمين البدلاء."
                : activeSection === "POLICY"
                  ? "تحكم في آلية المفاضلة وحدود ترشيح المعلمين للانتظار."
                  : activeSection === "TEACHERS"
                    ? "حدد الأيام والحصص المستبعدة وأولوية كل معلم."
                    : "أنشئ المناوبات واربطها بالمعلمين وفترات الدوام."}
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-white p-1 sm:flex sm:w-auto sm:flex-wrap">
            <TabButton
              active={
                activeSection === "ABSENCE"
              }
              onClick={() =>
                onSectionChange("ABSENCE")
              }
            >
              رصد الغياب
            </TabButton>

            <TabButton
              active={
                activeSection === "POLICY"
              }
              onClick={() =>
                onSectionChange("POLICY")
              }
            >
              ضوابط الانتظار
            </TabButton>

            <TabButton
              active={
                activeSection === "TEACHERS"
              }
              onClick={() =>
                onSectionChange("TEACHERS")
              }
            >
              إعدادات المعلمين
            </TabButton>

            <TabButton
              active={
                activeSection === "SUPERVISION"
              }
              onClick={() =>
                onSectionChange("SUPERVISION")
              }
            >
              المناوبات والإشراف
            </TabButton>
          </div>
        </div>
      </header>

      {activeSection === "ABSENCE" ? (
        <div className="p-4 sm:p-6">
          {absenceContent}
        </div>
      ) : null}

      {activeSection === "POLICY" ? (
        <div className="space-y-6 p-5 sm:p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <NumberField
              label="عدد المرشحين لكل حصة"
              value={policy.candidateCount}
              min={1}
              max={10}
              onChange={(value) =>
                updatePolicy(
                  "candidateCount",
                  value,
                )
              }
            />

            <NumberField
              label="الحد اليومي للانتظار"
              value={
                policy.maxDailySubstitutions
              }
              min={1}
              max={10}
              onChange={(value) =>
                updatePolicy(
                  "maxDailySubstitutions",
                  value,
                )
              }
            />

            <NumberField
              label="الحد الأسبوعي للانتظار"
              value={
                policy.maxWeeklySubstitutions
              }
              min={1}
              max={10}
              onChange={(value) =>
                updatePolicy(
                  "maxWeeklySubstitutions",
                  value,
                )
              }
            />

            <NumberField
              label="النصاب المرجعي"
              value={
                policy.settingsJson
                  ?.referenceLoad || 24
              }
              min={1}
              max={40}
              onChange={(value) =>
                updateSettings(
                  (settings) => ({
                    ...settings,
                    referenceLoad: value,
                  }),
                )
              }
            />
          </div>

          <SettingsGroup
            title="حدود موقع حصة الانتظار"
            description="حدد متى يُسمح بإضافة حصة انتظار إلى يوم المعلم."
          >
            <Toggle
              label="السماح قبل أول حصة"
              description="ترشيح المعلم قبل بداية جدوله اليومي."
              checked={
                policy.allowBeforeFirstLesson
              }
              onChange={(checked) =>
                updatePolicy(
                  "allowBeforeFirstLesson",
                  checked,
                )
              }
            />

            <Toggle
              label="السماح بعد آخر حصة"
              description="ترشيح المعلم بعد نهاية جدوله اليومي."
              checked={
                policy.allowAfterLastLesson
              }
              onChange={(checked) =>
                updatePolicy(
                  "allowAfterLastLesson",
                  checked,
                )
              }
            />

            <Toggle
              label="السماح داخل الفراغ"
              description="استخدام الحصص الفارغة الواقعة بين حصص المعلم."
              checked={
                policy.allowInsideGap
              }
              onChange={(checked) =>
                updatePolicy(
                  "allowInsideGap",
                  checked,
                )
              }
            />

            <Toggle
              label="تفضيل الفراغ الداخلي"
              description="رفع أولوية المعلم إذا كانت الحصة داخل فراغ."
              checked={
                policy.preferInsideGap
              }
              onChange={(checked) =>
                updatePolicy(
                  "preferInsideGap",
                  checked,
                )
              }
            />
          </SettingsGroup>

          <SettingsGroup
            title="قيود تكافؤ التوزيع والتنفيذ"
            description="ضوابط تمنع إرهاق المعلم وتحافظ على تكافؤ التوزيع."
          >
            <Toggle
              label="منع انتظارين متتاليين"
              description="عدم إسناد حصتي انتظار متجاورتين للمعلم نفسه."
              checked={
                policy.preventConsecutiveSubstitutions
              }
              onChange={(checked) =>
                updatePolicy(
                  "preventConsecutiveSubstitutions",
                  checked,
                )
              }
            />

            <Toggle
              label="منع الحصة الأولى"
              description="عدم ترشيح أي معلم للانتظار في الحصة الأولى."
              checked={
                policy.preventFirstPeriod
              }
              onChange={(checked) =>
                updatePolicy(
                  "preventFirstPeriod",
                  checked,
                )
              }
            />

            <Toggle
              label="منع الحصة الأخيرة"
              description="عدم ترشيح أي معلم للانتظار في الحصة الأخيرة."
              checked={
                policy.preventLastPeriod
              }
              onChange={(checked) =>
                updatePolicy(
                  "preventLastPeriod",
                  checked,
                )
              }
            />

            <Toggle
              label="السماح في اليوم الذهبي"
              description="السماح باستخدام يوم المعلم المستثنى."
              checked={
                policy.allowOnGoldenDay
              }
              onChange={(checked) =>
                updatePolicy(
                  "allowOnGoldenDay",
                  checked,
                )
              }
            />

            <Toggle
              label="طوارئ اليوم الذهبي"
              description="السماح بالترشيح عند عدم وجود بدائل أخرى."
              checked={
                policy.goldenDayEmergency
              }
              onChange={(checked) =>
                updatePolicy(
                  "goldenDayEmergency",
                  checked,
                )
              }
            />
          </SettingsGroup>

          <SettingsGroup
            title="الحضور والانصراف والتخصص"
            description="تطبيق ضوابط التأخر والانصراف ومدى مطابقة التخصص."
          >
            <Toggle
              label="السماح بعد الحضور المتأخر"
              description="إتاحة المعلم للحصص التالية لوصوله."
              checked={
                policy.allowAfterLateArrival
              }
              onChange={(checked) =>
                updatePolicy(
                  "allowAfterLateArrival",
                  checked,
                )
              }
            />

            <Toggle
              label="استبعاد يوم التأخر كاملًا"
              description="عدم ترشيح المعلم في يوم تسجيل التأخر."
              checked={
                policy.excludeLateArrivalDay
              }
              onChange={(checked) =>
                updatePolicy(
                  "excludeLateArrivalDay",
                  checked,
                )
              }
            />

            <Toggle
              label="السماح قبل الانصراف المبكر"
              description="إتاحة المعلم للحصص الواقعة قبل وقت انصرافه."
              checked={
                policy.allowBeforeEarlyDeparture
              }
              onChange={(checked) =>
                updatePolicy(
                  "allowBeforeEarlyDeparture",
                  checked,
                )
              }
            />

            <Toggle
              label="اشتراط تطابق التخصص"
              description="استبعاد المعلم إذا كان تخصصه غير مطابق."
              checked={
                policy.requireMatchingSpecialty
              }
              onChange={(checked) =>
                updatePolicy(
                  "requireMatchingSpecialty",
                  checked,
                )
              }
            />

            <Toggle
              label="تفضيل تطابق التخصص"
              description="رفع درجة المرشح عند تطابق التخصص."
              checked={
                policy.preferMatchingSpecialty
              }
              onChange={(checked) =>
                updatePolicy(
                  "preferMatchingSpecialty",
                  checked,
                )
              }
            />
          </SettingsGroup>

          <SettingsGroup
            title="أوزان المفاضلة"
            description="كلما زاد الوزن ارتفع تأثير العامل في ترتيب المرشحين."
          >
            <NumberField
              label="وزن النصاب الأسبوعي"
              value={
                policy.weeklyLoadWeight
              }
              min={0}
              max={1000}
              onChange={(value) =>
                updatePolicy(
                  "weeklyLoadWeight",
                  value,
                )
              }
            />

            <NumberField
              label="وزن انتظار الأسبوع"
              value={
                policy.weeklyWaitingWeight
              }
              min={0}
              max={1000}
              onChange={(value) =>
                updatePolicy(
                  "weeklyWaitingWeight",
                  value,
                )
              }
            />

            <NumberField
              label="وزن انتظار اليوم"
              value={
                policy.dailyWaitingWeight
              }
              min={0}
              max={1000}
              onChange={(value) =>
                updatePolicy(
                  "dailyWaitingWeight",
                  value,
                )
              }
            />

            <NumberField
              label="وزن الفراغ الداخلي"
              value={
                policy.gapPreferenceWeight
              }
              min={0}
              max={1000}
              onChange={(value) =>
                updatePolicy(
                  "gapPreferenceWeight",
                  value,
                )
              }
            />

            <NumberField
              label="وزن التخصص"
              value={
                policy.specialtyWeight
              }
              min={0}
              max={1000}
              onChange={(value) =>
                updatePolicy(
                  "specialtyWeight",
                  value,
                )
              }
            />

            <NumberField
              label="وزن تكافؤ توزيع الحصتين الأولى والأخيرة"
              value={
                policy.firstLastFairnessWeight
              }
              min={0}
              max={1000}
              onChange={(value) =>
                updatePolicy(
                  "firstLastFairnessWeight",
                  value,
                )
              }
            />
          </SettingsGroup>

          <SaveBar
            busy={saving}
            text="حفظ ضوابط الانتظار"
            onClick={() =>
              void savePolicy()
            }
          />
        </div>
      ) : null}

      {activeSection === "TEACHERS" ? (
        <div className="space-y-6 p-5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
              <label className="block text-xs font-black text-slate-700">
                المعلم
              </label>

              <select
                value={
                  selectedTeacher?.id || ""
                }
                onChange={(event) =>
                  setSelectedTeacherId(
                    event.target.value,
                  )
                }
                className={inputClassName}
              >
                {teachers.map((teacher) => (
                  <option
                    key={teacher.id}
                    value={teacher.id}
                  >
                    {teacher.name}
                  </option>
                ))}
              </select>

              {selectedTeacher ? (
                <div className="mt-4">
                  <TimetableDataCard
                    icon={<UserRound className="h-5 w-5" />}
                    eyebrow="إعدادات الانتظار"
                    title={selectedTeacher.name}
                    description={selectedTeacher.specialty || "دون تخصص محدد"}
                    tone="sky"
                    metrics={[
                      { label: "النصاب الحالي", value: selectedTeacher.weeklyLoad },
                      { label: "الحد الأسبوعي", value: selectedTeacher.maxWeeklyLoad },
                    ]}
                    className="p-4"
                  />
                </div>
              ) : null}
            </div>

            {selectedTeacher ? (
              <div className="space-y-5">
                <TeacherOptionsGroup
                  title="اليوم الذهبي"
                  description="لا يرشح المعلم في هذه الأيام إلا إذا سمحت الضوابط بذلك."
                  options={days.map(
                    (day) => ({
                      id: day.id,
                      label: day.label,
                    }),
                  )}
                  selected={
                    policy.settingsJson
                      ?.goldenDaysByTeacher?.[
                      selectedTeacher.id
                    ] || []
                  }
                  onToggle={(value) =>
                    toggleTeacherSetting(
                      "goldenDaysByTeacher",
                      selectedTeacher.id,
                      value,
                    )
                  }
                />

                <TeacherOptionsGroup
                  title="الأيام المستبعدة"
                  description="استبعاد المعلم نهائيًا من الانتظار في الأيام المحددة."
                  options={days.map(
                    (day) => ({
                      id: day.id,
                      label: day.label,
                    }),
                  )}
                  selected={
                    policy.settingsJson
                      ?.excludedDaysByTeacher?.[
                      selectedTeacher.id
                    ] || []
                  }
                  onToggle={(value) =>
                    toggleTeacherSetting(
                      "excludedDaysByTeacher",
                      selectedTeacher.id,
                      value,
                    )
                  }
                />

                <TeacherOptionsGroup
                  title="الحصص المستبعدة"
                  description="استبعاد المعلم من الانتظار في أرقام الحصص المحددة."
                  options={teachingPeriods.map(
                    (period) => ({
                      id: period.id,
                      label: period.label,
                    }),
                  )}
                  selected={
                    policy.settingsJson
                      ?.excludedPeriodsByTeacher?.[
                      selectedTeacher.id
                    ] || []
                  }
                  onToggle={(value) =>
                    toggleTeacherSetting(
                      "excludedPeriodsByTeacher",
                      selectedTeacher.id,
                      value,
                    )
                  }
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <NumberField
                    label="الأولوية اليدوية"
                    value={
                      policy.settingsJson
                        ?.priorityByTeacher?.[
                        selectedTeacher.id
                      ] || 0
                    }
                    min={-100}
                    max={100}
                    onChange={(value) =>
                      updateSettings(
                        (settings) => ({
                          ...settings,
                          priorityByTeacher: {
                            ...(settings.priorityByTeacher ||
                              {}),
                            [selectedTeacher.id]:
                              value,
                          },
                        }),
                      )
                    }
                  />

                  <label className="block">
                    <span className="mb-2 block text-xs font-black text-slate-700">
                      ملاحظات المعلم
                    </span>

                    <textarea
                      rows={3}
                      value={
                        policy.settingsJson
                          ?.notesByTeacher?.[
                          selectedTeacher.id
                        ] || ""
                      }
                      onChange={(event) =>
                        updateSettings(
                          (settings) => ({
                            ...settings,
                            notesByTeacher: {
                              ...(settings.notesByTeacher ||
                                {}),
                              [selectedTeacher.id]:
                                event.target
                                  .value,
                            },
                          }),
                        )
                      }
                      className={`${inputClassName} resize-none`}
                    />
                  </label>
                </div>
              </div>
            ) : null}
          </div>

          <SaveBar
            busy={saving}
            text="حفظ إعدادات المعلمين"
            onClick={() =>
              void savePolicy()
            }
          />
        </div>
      ) : null}

      {activeSection === "SUPERVISION" ? (
        <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <div className="h-fit rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-black text-sky-700">
              إضافة تكليف
            </p>

            <h3 className="mt-1 text-lg font-black text-slate-950">
              مناوبة أو إشراف جديد
            </h3>

            <div className="mt-5 space-y-4">
              <Field label="عنوان المناوبة">
                <input
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value,
                    )
                  }
                  placeholder="مثال: إشراف الفسحة الأولى"
                  className={inputClassName}
                />
              </Field>

              <Field label="نوع التكليف">
                <select
                  value={dutyType}
                  onChange={(event) =>
                    setDutyType(
                      event.target.value,
                    )
                  }
                  className={inputClassName}
                >
                  <option value="MORNING">
                    إشراف صباحي
                  </option>
                  <option value="BREAK">
                    إشراف الفسحة
                  </option>
                  <option value="GATE">
                    بوابة المدرسة
                  </option>
                  <option value="END_OF_DAY">
                    نهاية الدوام
                  </option>
                  <option value="PRAYER">
                    الصلاة
                  </option>
                  <option value="BUS">
                    الحافلات
                  </option>
                  <option value="FLOOR">
                    إشراف الأدوار
                  </option>
                  <option value="CUSTOM">
                    تكليف مخصص
                  </option>
                </select>
              </Field>

              <Field label="اليوم">
                <select
                  value={dayId}
                  onChange={(event) =>
                    setDayId(
                      event.target.value,
                    )
                  }
                  className={inputClassName}
                >
                  {days.map((day) => (
                    <option
                      key={day.id}
                      value={day.id}
                    >
                      {day.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="الحصة المرتبطة">
                <select
                  value={periodId}
                  onChange={(event) =>
                    setPeriodId(
                      event.target.value,
                    )
                  }
                  className={inputClassName}
                >
                  <option value="">
                    دون حصة محددة
                  </option>

                  {teachingPeriods.map(
                    (period) => (
                      <option
                        key={period.id}
                        value={period.id}
                      >
                        {period.label}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="وقت البداية">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(event) =>
                      setStartTime(
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="وقت النهاية">
                  <input
                    type="time"
                    value={endTime}
                    onChange={(event) =>
                      setEndTime(
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>
              </div>

              <Field label="الموقع">
                <input
                  value={location}
                  onChange={(event) =>
                    setLocation(
                      event.target.value,
                    )
                  }
                  placeholder="الساحة أو البوابة"
                  className={inputClassName}
                />
              </Field>

              <NumberField
                label="عدد المعلمين المطلوب"
                value={requiredTeachers}
                min={1}
                max={20}
                onChange={
                  setRequiredTeachers
                }
              />

              <Field label="المعلمون المكلفون">
                <div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3">
                  {teachers.map((teacher) => {
                    const checked =
                      teacherIds.includes(
                        teacher.id,
                      );

                    return (
                      <label
                        key={teacher.id}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 transition hover:bg-sky-50"
                      >
                        <span>
                          <span className="block text-sm font-black text-slate-950">
                            {teacher.name}
                          </span>

                          <span className="text-[11px] font-bold text-slate-500">
                            {teacher.weeklyLoad}/
                            {
                              teacher.maxWeeklyLoad
                            }
                            {" · "}
                            {teacher.specialty ||
                              "دون تخصص"}
                          </span>
                        </span>

                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setTeacherIds(
                              (current) =>
                                checked
                                  ? current.filter(
                                      (
                                        item,
                                      ) =>
                                        item !==
                                        teacher.id,
                                    )
                                  : [
                                      ...current,
                                      teacher.id,
                                    ],
                            )
                          }
                          className="h-5 w-5 accent-sky-700"
                        />
                      </label>
                    );
                  })}
                </div>
              </Field>

              <Field label="ملاحظات">
                <textarea
                  rows={3}
                  value={supervisionNote}
                  onChange={(event) =>
                    setSupervisionNote(
                      event.target.value,
                    )
                  }
                  className={`${inputClassName} resize-none`}
                />
              </Field>

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  void createSupervision()
                }
                className="w-full rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving
                  ? "جارٍ الحفظ..."
                  : editingDutyId
                    ? "حفظ تعديل المناوبة"
                    : "حفظ المناوبة"}
              </button>
              {editingDutyId ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={cancelSupervisionEdit}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 disabled:opacity-50"
                >
                  إلغاء التعديل
                </button>
              ) : null}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-sky-700">
                  السجل الحالي
                </p>

                <h3 className="mt-1 text-lg font-black text-slate-950">
                  المناوبات والإشراف
                </h3>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
                {
                  supervisionDuties.length
                }{" "}
                تكليف
              </span>
            </div>

            {!supervisionDuties.length ? (
              <div className="mt-5">
                <TimetableEmptyState
                  icon={<ShieldCheck className="h-6 w-6" />}
                  title="لا توجد مناوبات محفوظة"
                  description="أضف المناوبات لتدخل ضمن فحص تعارضات المعلمين."
                />
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {supervisionDuties.map(
                  (duty) => (
                    <article
                      key={duty.id}
                      className="rounded-[1.75rem] border border-sky-200 bg-sky-50/35 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
                              {dutyTypeLabel(
                                duty.dutyType,
                              )}
                            </span>

                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                              {dayLabel(
                                duty.dayId,
                                days,
                              )}
                            </span>

                            {duty.periodId ? (
                              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                                {periodLabel(
                                  duty.periodId,
                                  teachingPeriods,
                                )}
                              </span>
                            ) : null}
                          </div>

                          <h4 className="mt-3 font-black text-slate-950">
                            {duty.title}
                          </h4>

                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {duty.location ||
                              "دون موقع محدد"}
                            {duty.startTime
                              ? ` · ${duty.startTime}`
                              : ""}
                            {duty.endTime
                              ? ` - ${duty.endTime}`
                              : ""}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => editSupervision(duty)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 disabled:opacity-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            تعديل
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void deleteSupervision(duty.id)}
                            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 disabled:opacity-50"
                          >
                            حذف
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {duty.assignments.map(
                          (assignment) => (
                            <span
                              key={
                                assignment.id
                              }
                              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700"
                            >
                              {
                                assignment
                                  .teacher.name
                              }
                              {assignment.isPrimary
                                ? " · أساسي"
                                : ""}
                            </span>
                          ),
                        )}
                      </div>

                      {duty.note ? (
                        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold leading-5 text-slate-600">
                          {duty.note}
                        </p>
                      ) : null}
                    </article>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SettingsGroup({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <h3 className="font-black text-slate-950">
        {title}
      </h3>

      <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
        {description}
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {children}
      </div>
    </section>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
      <span>
        <span className="block text-sm font-black text-slate-950">
          {label}
        </span>

        <span className="mt-1 block text-xs font-bold leading-5 text-slate-500">
          {description}
        </span>
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        className="mt-1 h-5 w-5 shrink-0 accent-sky-700"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black text-slate-700">
        {label}
      </span>

      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const next =
            Number(event.target.value);

          onChange(
            Number.isFinite(next)
              ? Math.min(
                  max,
                  Math.max(min, next),
                )
              : min,
          );
        }}
        className={inputClassName}
      />
    </label>
  );
}

function TeacherOptionsGroup({
  title,
  description,
  options,
  selected,
  onToggle,
}: {
  title: string;
  description: string;
  options: Array<{
    id: string;
    label: string;
  }>;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
      <h3 className="font-black text-slate-950">
        {title}
      </h3>

      <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
        {description}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {options.map((option) => {
          const active =
            selected.includes(option.id);

          return (
            <button
              key={option.id}
              type="button"
              onClick={() =>
                onToggle(option.id)
              }
              className={
                active
                  ? "rounded-full bg-sky-700 px-4 py-2 text-xs font-black text-white"
                  : "rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600"
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SaveBar({
  busy,
  text,
  onClick,
}: {
  busy: boolean;
  text: string;
  onClick: () => void;
}) {
  return (
    <div className="sticky bottom-4 z-10 flex flex-col justify-between gap-3 rounded-2xl border border-sky-100 bg-white/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:items-center">
      <div>
        <p className="text-sm font-black text-slate-950">
          توجد إعدادات قابلة للحفظ
        </p>

        <p className="mt-1 text-xs font-bold text-slate-500">
          تطبق التغييرات على عمليات الترشيح
          القادمة.
        </p>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={onClick}
        className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {busy
          ? "جارٍ الحفظ..."
          : text}
      </button>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white shadow-sm"
          : "rounded-xl px-4 py-3 text-xs font-black text-slate-600 transition hover:bg-slate-50 hover:text-sky-700"
      }
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black text-slate-700">
        {label}
      </span>

      {children}
    </label>
  );
}

function normalizePolicy(
  policy: WaitingPolicy | null,
): WaitingPolicy {
  return {
    ...defaultPolicy,
    ...(policy || {}),
    settingsJson: {
      ...(defaultPolicy.settingsJson ||
        {}),
      ...(policy?.settingsJson || {}),
    },
  };
}

function dutyTypeLabel(type: string) {
  const labels: Record<string, string> = {
    MORNING: "إشراف صباحي",
    BREAK: "إشراف الفسحة",
    GATE: "بوابة المدرسة",
    END_OF_DAY: "نهاية الدوام",
    PRAYER: "الصلاة",
    BUS: "الحافلات",
    FLOOR: "إشراف الأدوار",
    CUSTOM: "تكليف مخصص",
  };

  return labels[type] || type;
}

function dayLabel(
  dayId: string,
  days: DayItem[],
) {
  return (
    days.find(
      (day) => day.id === dayId,
    )?.label || dayId
  );
}

function periodLabel(
  periodId: string,
  periods: Period[],
) {
  return (
    periods.find(
      (period) =>
        period.id === periodId,
    )?.label || periodId
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "حدث خطأ غير متوقع.";
}

const inputClassName =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100";
