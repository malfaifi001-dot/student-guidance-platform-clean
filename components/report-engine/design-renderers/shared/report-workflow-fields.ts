type WorkflowDynamicFieldCard = {
  key: string;
  label: string;
  value: string;
  valueItems?: string[];
};

const WORKFLOW_DYNAMIC_FIELD_LABELS: Record<string, string> = {
  activity_domain: "مجال النشاط",
  activity_program_scouting: "برنامج النشاط الكشفي",
  activity_program: "برنامج النشاط",
  semester: "الفصل الدراسي",
  term: "الفصل الدراسي",
  execution_mode: "طريقة التنفيذ",
  execution_method: "طريقة التنفيذ",
  planned_sessions: "عدد اللقاءات المخططة",
  sessions_count: "عدد اللقاءات",
  start_week: "أسبوع البداية",
  week: "الأسبوع",
  start_day: "يوم البداية",
  start_date: "تاريخ البداية",
  end_week: "أسبوع النهاية",
  end_day: "يوم النهاية",
  end_date: "تاريخ النهاية",
  target_class: "الفئة المستهدفة",
  target_group: "الفئة المستهدفة",
  participant_students_count: "عدد الطلاب المشاركين",
  students_with_disabilities_count: "عدد طلاب ذوي الإعاقة",
  community_partnership_count: "عدد الشراكات المجتمعية",
  parents_participated: "مشاركة أولياء الأمور",
};

const WORKFLOW_DYNAMIC_VALUE_LABELS: Record<string, string> = {
  scouting: "النشاط الكشفي",
  citizenship_life: "المواطنة والحياة",
  science_technology: "العلوم والتقنية",
  culture_arts: "الثقافة والفنون",
  sports_health: "الرياضة والصحة",
  events_occasions: "الأيام والمناسبات",
  non_class_periods: "الفترات اللاصفية",
  school_broadcast: "الإذاعة المدرسية",

  term_1: "الفصل الدراسي الأول",
  term_2: "الفصل الدراسي الثاني",
  term_3: "الفصل الدراسي الثالث",
  semester_1: "الفصل الدراسي الأول",
  semester_2: "الفصل الدراسي الثاني",
  semester_3: "الفصل الدراسي الثالث",

  activity_leader: "رائد النشاط",
  teacher: "المعلم",
  counselor: "الموجه الطلابي",

  sunday: "الأحد",
  monday: "الاثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
  saturday: "السبت",

  yes: "نعم",
  no: "لا",
  true: "نعم",
  false: "لا",
};

export function cleanWorkflowDynamicText(value: unknown) {
  return String(value ?? "").trim();
}

function isTechnicalWorkflowText(value: string) {
  return /^[a-z0-9_/-]+$/i.test(value) && /[a-z_]/i.test(value);
}

function translateWorkflowDynamicLabel(key: unknown, label: unknown) {
  const cleanKey = cleanWorkflowDynamicText(key);
  const cleanLabel = cleanWorkflowDynamicText(label);

  if (cleanLabel && cleanLabel !== cleanKey && !isTechnicalWorkflowText(cleanLabel)) {
    return cleanLabel;
  }

  return WORKFLOW_DYNAMIC_FIELD_LABELS[cleanKey] || cleanLabel || cleanKey;
}

function translateWorkflowDynamicValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";

  if (Array.isArray(value)) {
    return value
      .map((item) => translateWorkflowDynamicValue(item))
      .filter(Boolean)
      .join("، ");
  }

  if (typeof value === "boolean") {
    return value ? "نعم" : "لا";
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      translateWorkflowDynamicValue(record.label) ||
      translateWorkflowDynamicValue(record.name) ||
      translateWorkflowDynamicValue(record.value) ||
      translateWorkflowDynamicValue(record.key) ||
      translateWorkflowDynamicValue(record.id) ||
      ""
    );
  }

  const text = cleanWorkflowDynamicText(value);
  const normalized = text.toLowerCase();

  if (WORKFLOW_DYNAMIC_VALUE_LABELS[normalized]) {
    return WORKFLOW_DYNAMIC_VALUE_LABELS[normalized];
  }

  const programMatch = /^program[_-](\d+)$/i.exec(text);
  if (programMatch) {
    return `برنامج النشاط رقم ${Number(programMatch[1])}`;
  }

  return text;
}

export function translateWorkflowDynamicValueItems(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => translateWorkflowDynamicValue(item))
        .filter(Boolean)
    )
  );
}

export function getWorkflowDynamicFieldCards(previewCase: any): WorkflowDynamicFieldCard[] {
  return (previewCase?.values || [])
    .map((item: any, index: number) => {
      const key = cleanWorkflowDynamicText(item.fieldKey);
      const label = translateWorkflowDynamicLabel(
        item.fieldKey,
        item.fieldLabel || `حقل ${index + 1}`,
      );
      const value = translateWorkflowDynamicValue(item.value);
      const valueItems = Array.isArray(item.valueItems)
        ? translateWorkflowDynamicValueItems(item.valueItems)
        : translateWorkflowDynamicValueItems(item.value);

      return {
        key: key || label || `workflow-field-${index + 1}`,
        label,
        value,
        valueItems,
      };
    })
    .filter((item: any) => item.label && item.value);
}
