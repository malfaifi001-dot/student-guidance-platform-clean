import type {
  ReportTemplateBuilderModel,
  ReportTemplateBlock,
  ReportTextSnippet,
} from "@/lib/report-engine/report-template-builder-types";

export type ReportEvidenceItem = {
  id?: string;
  title?: string;
  caption?: string;
  description?: string;
  fileUrl?: string;
  url?: string;
  type?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  createdAt?: string | Date;
  [key: string]: unknown;
};

type RuntimeStudentData = {
  name?: string;
  nationalId?: string;
  grade?: string;
  classroom?: string;
  gender?: string;
  [key: string]: unknown;
};

type RuntimeServiceData = {
  name?: string;
  slug?: string;
  [key: string]: unknown;
};

export type RuntimeReportData = {
  reportTitle?: string;
  createdAt?: string | Date;
  values?: Record<string, unknown>;
  evidences?: ReportEvidenceItem[];

  student?: RuntimeStudentData | null;
  service?: RuntimeServiceData | null;

  caseEntry?: {
    title?: string;
    student?: RuntimeStudentData | null;
    service?: RuntimeServiceData | null;
    [key: string]: unknown;
  } | null;

  school?: {
    name?: string;
    schoolYear?: string;
    semester?: string;
    principalName?: string;
    [key: string]: unknown;
  } | null;

  counselor?: {
    name?: string;
    [key: string]: unknown;
  } | null;

  [key: string]: unknown;
};

export type TextLibrarySourceMode =
  | "same-template-service"
  | "global"
  | "specific-service"
  | "all";

export type TextLibraryRenderMode = "first" | "all" | "selected";

export type TextLibraryFallbackBehavior = "hide" | "show-fallback";

export type TextLibrarySettings = {
  textSourceMode?: TextLibrarySourceMode;
  serviceSlug?: string;
  category?: string;
  renderMode?: TextLibraryRenderMode;
  snippetId?: string;
  fallbackBehavior?: TextLibraryFallbackBehavior;
  fallbackText?: string;
  editableByCounselor?: boolean;
};

export type NormalizedTextLibrarySettings = Required<TextLibrarySettings>;

export const DEFAULT_TEXT_LIBRARY_SETTINGS: NormalizedTextLibrarySettings = {
  textSourceMode: "same-template-service",
  serviceSlug: "",
  category: "all",
  renderMode: "first",
  snippetId: "",
  fallbackBehavior: "show-fallback",
  fallbackText: "لم يتم اختيار نص من مكتبة النصوص بعد.",
  editableByCounselor: false,
};

export const DEFAULT_TEXT_LIBRARY_BLOCK_SETTINGS =
  DEFAULT_TEXT_LIBRARY_SETTINGS;

export type TextLibraryBlockSettings = TextLibrarySettings;

export type ResolvedTextSnippet = {
  id: string;
  title: string;
  category: string;
  serviceSlug: string;
  renderedText: string;
  originalText: string;
  isGlobal: boolean;
};

type BlockSettingsWithTextLibrary = NonNullable<
  ReportTemplateBlock["settings"]
> & {
  textLibrary?: TextLibrarySettings;
};

export function getTextLibrarySettings(
  block: ReportTemplateBlock,
): NormalizedTextLibrarySettings {
  const blockSettings = block.settings as
    | BlockSettingsWithTextLibrary
    | undefined;

  return {
    ...DEFAULT_TEXT_LIBRARY_SETTINGS,
    ...(blockSettings?.textLibrary ?? {}),
  };
}

export function setTextLibrarySettingsOnBlock(
  block: ReportTemplateBlock,
  settings: TextLibrarySettings,
): ReportTemplateBlock {
  const currentSettings = getTextLibrarySettings(block);

  const nextSettings = {
    ...(block.settings ?? {}),
    textLibrary: {
      ...currentSettings,
      ...settings,
    },
  } as ReportTemplateBlock["settings"];

  return {
    ...block,
    settings: nextSettings,
  };
}

export function matchesTextLibraryService(params: {
  snippet: ReportTextSnippet;
  template: ReportTemplateBuilderModel;
  settings: TextLibrarySettings;
}): boolean {
  const { snippet, template } = params;

  const settings: NormalizedTextLibrarySettings = {
    ...DEFAULT_TEXT_LIBRARY_SETTINGS,
    ...params.settings,
  };

  if (settings.textSourceMode === "all") {
    return true;
  }

  if (settings.textSourceMode === "global") {
    return isGlobalTextSnippet(snippet);
  }

  if (settings.textSourceMode === "specific-service") {
    if (!settings.serviceSlug) {
      return false;
    }

    return snippet.serviceSlug === settings.serviceSlug;
  }

  if (settings.textSourceMode === "same-template-service") {
    if (isGlobalTextSnippet(snippet)) {
      return true;
    }

    if (template.scope === "SERVICE" && template.serviceSlug) {
      return snippet.serviceSlug === template.serviceSlug;
    }

    return false;
  }

  return false;
}

export function getMatchingTextSnippets(params: {
  block: ReportTemplateBlock;
  template: ReportTemplateBuilderModel;
  snippets: ReportTextSnippet[];
}): ReportTextSnippet[] {
  const { block, template, snippets } = params;
  const settings = getTextLibrarySettings(block);

  const candidates = snippets.filter((snippet) => {
    const serviceMatch = matchesTextLibraryService({
      snippet,
      template,
      settings,
    });

    if (!serviceMatch) {
      return false;
    }

    if (settings.category && settings.category !== "all") {
      return snippet.category === settings.category;
    }

    return true;
  });

  if (settings.renderMode === "selected" && settings.snippetId) {
    return candidates.filter((snippet) => snippet.id === settings.snippetId);
  }

  return candidates;
}

export function resolveTextLibrarySnippets(params: {
  block: ReportTemplateBlock;
  template: ReportTemplateBuilderModel;
  snippets: ReportTextSnippet[];
  data: RuntimeReportData;
}): ResolvedTextSnippet[] {
  const { block, template, snippets, data } = params;
  const settings = getTextLibrarySettings(block);

  const matchingSnippets = getMatchingTextSnippets({
    block,
    template,
    snippets,
  });

  let selectedSnippets: ReportTextSnippet[] = [];

  if (settings.renderMode === "selected") {
    selectedSnippets = matchingSnippets.filter(
      (snippet) => snippet.id === settings.snippetId,
    );
  } else if (settings.renderMode === "all") {
    selectedSnippets = matchingSnippets;
  } else {
    selectedSnippets = matchingSnippets.slice(0, 1);
  }

  const variables = buildRuntimeVariables(data);

  return selectedSnippets.map((snippet) => {
    const text = getSnippetText(snippet);

    return {
      id: snippet.id,
      title: snippet.title,
      category: snippet.category,
      serviceSlug: snippet.serviceSlug ?? "",
      isGlobal: isGlobalTextSnippet(snippet),
      originalText: text,
      renderedText: renderTextWithVariables(text, variables),
    };
  });
}

export function resolveTextLibraryFallback(params: {
  block: ReportTemplateBlock;
}): string | null {
  const { block } = params;
  const settings = getTextLibrarySettings(block);

  if (settings.fallbackBehavior === "hide") {
    return null;
  }

  return (
    settings.fallbackText ||
    DEFAULT_TEXT_LIBRARY_SETTINGS.fallbackText ||
    "لم يتم اختيار نص من مكتبة النصوص بعد."
  );
}

export function buildRuntimeVariables(
  data: RuntimeReportData,
): Record<string, string> {
  const student = getStudent(data);
  const values = getRuntimeValues(data);

  return {
    reportTitle: safeText(data.reportTitle),
    caseTitle: getCaseTitle(data),
    serviceName: getServiceName(data),

    studentName: safeText(student?.name),
    studentNationalId: safeText(student?.nationalId),
    studentGrade: safeText(student?.grade),
    studentClassroom: safeText(student?.classroom),
    studentGender: safeText(student?.gender),

    schoolName: safeText(data.school?.name),
    schoolYear: safeText(data.school?.schoolYear),
    semester: safeText(data.school?.semester),
    counselorName: safeText(data.counselor?.name),
    principalName: safeText(data.school?.principalName),

    programTitle:
      safeText(values.programTitle) ||
      safeText(values.title) ||
      getCaseTitle(data),

    executionDate:
      safeText(values.executionDate) ||
      safeText(values.date) ||
      safeText(data.createdAt),

    dayText: safeText(values.dayText) || safeText(values.day),

    targetGroup:
      safeText(values.targetGroup) ||
      safeText(values.audience) ||
      safeText(values.beneficiaries),

    objective:
      safeText(values.objective) ||
      safeText(values.objectives) ||
      safeText(values.goal),

    procedures:
      safeText(values.procedures) ||
      safeText(values.actions) ||
      safeText(values.implementation),

    results:
      safeText(values.results) ||
      safeText(values.outcomes) ||
      safeText(values.result),

    recommendations:
      safeText(values.recommendations) ||
      safeText(values.recommendation),

    notes: safeText(values.notes),
  };
}

export function renderTextWithVariables(
  text: string,
  variables: Record<string, string>,
): string {
  return text.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const normalizedKey = String(key).trim();
    return variables[normalizedKey] ?? `{${normalizedKey}}`;
  });
}

export function getRuntimeValues(
  data: RuntimeReportData,
): Record<string, unknown> {
  if (!data.values || typeof data.values !== "object") {
    return {};
  }

  return data.values;
}

export function getRuntimeEvidences(
  data: RuntimeReportData,
): ReportEvidenceItem[] {
  if (!Array.isArray(data.evidences)) {
    return [];
  }

  return data.evidences;
}

export function getStudent(data: RuntimeReportData): RuntimeStudentData | null {
  return data.student ?? data.caseEntry?.student ?? null;
}

export function getCaseTitle(data: RuntimeReportData): string {
  return (
    safeText(data.caseEntry?.title) ||
    safeText(data.reportTitle) ||
    "تقرير إرشادي"
  );
}

export function getServiceName(data: RuntimeReportData): string {
  return (
    safeText(data.service?.name) ||
    safeText(data.caseEntry?.service?.name) ||
    "خدمة إرشادية"
  );
}

function isGlobalTextSnippet(snippet: ReportTextSnippet): boolean {
  return !snippet.serviceSlug;
}

function getSnippetText(snippet: ReportTextSnippet): string {
  const candidate = snippet as ReportTextSnippet & {
    text?: unknown;
    content?: unknown;
    body?: unknown;
  };

  return (
    safeText(candidate.text) ||
    safeText(candidate.content) ||
    safeText(candidate.body)
  );
}

function safeText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toLocaleDateString("ar-SA");
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}