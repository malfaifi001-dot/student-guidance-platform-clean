"use client";

import { useMemo, useState } from "react";

type TemplateStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type TemplateScope = "GLOBAL" | "SERVICE" | "WORKFLOW" | "LOCATION";

type BlockKind =
  | "hero-title"
  | "meta-strip"
  | "plain-text"
  | "section-text"
  | "multi-paragraph"
  | "highlight-note"
  | "bullet-list"
  | "dynamic-fields"
  | "closing-note";

type BlockVariant =
  | "hero"
  | "plain"
  | "card"
  | "soft"
  | "highlight"
  | "outline"
  | "quote";

type TextSource = "manual" | "library";

type StudioTextSnippet = {
  id: string;
  title: string;
  category: "مقدمة" | "هدف" | "إجراء" | "نتيجة" | "توصية" | "خاتمة";
  content: string;
};

type StudioBlock = {
  id: string;
  kind: BlockKind;
  title: string;
  content: string;
  variant: BlockVariant;
  source: TextSource;
  snippetId?: string;
  showTitle: boolean;
  showMeta: boolean;
  align: "right" | "center";
};

type StudioTemplate = {
  id: string;
  name: string;
  description: string;
  status: TemplateStatus;
  scope: TemplateScope;
  serviceSlug?: string;
  workflowSlug?: string;
  locationKey?: string;
  previewCaseId: string;
  documentType: "REPORT";
  updatedAt: string;
  page: {
    id: string;
    title: string;
    blocks: StudioBlock[];
  };
};

type PreviewCaseValue = {
  fieldKey?: string | null;
  fieldLabel?: string | null;
  value?: string | null;
};

type PreviewCaseData = {
  found?: boolean;
  caseId?: string;
  serviceSlug?: string;
  serviceName?: string;
  title?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  student?: {
    name?: string;
    nationalId?: string;
    grade?: string;
    classroom?: string;
    stage?: string;
    guardianName?: string;
    guardianPhone?: string;
  };
  values?: PreviewCaseValue[];
  evidences?: Array<{
    id?: string;
    title?: string;
    fileUrl?: string;
    imageUrl?: string;
    caption?: string;
  }>;
};

const statusLabels: Record<TemplateStatus, string> = {
  DRAFT: "مسودة",
  PUBLISHED: "منشور",
  ARCHIVED: "مؤرشف",
};

const scopeLabels: Record<TemplateScope, string> = {
  GLOBAL: "عام لكل المنصة",
  SERVICE: "موجه لخدمة",
  WORKFLOW: "موجه لـ Workflow",
  LOCATION: "موجه لمكان محدد",
};

const textSnippets: StudioTextSnippet[] = [
  {
    id: "intro-official",
    title: "مقدمة رسمية مختصرة",
    category: "مقدمة",
    content:
      "بناءً على ما تم رصده في {{service.name}}، تم إعداد هذا التقرير لتوثيق الإجراء المتخذ وبيان أبرز النتائج والتوصيات.",
  },
  {
    id: "meeting-summary",
    title: "صياغة اجتماع",
    category: "إجراء",
    content:
      "تم عقد اجتماع {{field.meetingName}} بتاريخ {{field.meetingDate}}، وذلك لمناقشة {{field.discussionTopic}} واتخاذ ما يلزم من توصيات.",
  },
  {
    id: "student-followup",
    title: "صياغة متابعة طالب",
    category: "إجراء",
    content:
      "تمت متابعة حالة الطالب/الطالبة {{student.name}} في الصف {{student.grade}}، وجرى توثيق الإجراء وفق البيانات المسجلة في الحالة.",
  },
  {
    id: "result-positive",
    title: "نتيجة إيجابية",
    category: "نتيجة",
    content:
      "أسهمت الجهود المنفذة في تعزيز الوعي وتحسين مستوى التفاعل الإيجابي داخل البيئة التعليمية.",
  },
  {
    id: "recommendation-general",
    title: "توصية عامة",
    category: "توصية",
    content:
      "يوصى بمتابعة الحالة خلال الفترة القادمة، وتوثيق أي مستجدات، والتنسيق مع الأطراف ذات العلاقة عند الحاجة.",
  },
  {
    id: "closing-official",
    title: "خاتمة رسمية",
    category: "خاتمة",
    content:
      "جرى إعداد هذا التقرير من خلال منصة التوجيه الطلابي، وفق البيانات المدخلة والمعتمدة في الحالة.",
  },
];

const blockLibrary: Array<{
  kind: BlockKind;
  title: string;
  description: string;
  defaultContent: string;
  defaultVariant: BlockVariant;
  defaultAlign?: "right" | "center";
}> = [
  {
    kind: "hero-title",
    title: "عنوان رئيسي في المنتصف",
    description: "عنوان كبير للتقرير أو النموذج، مع إمكانية إظهار التاريخ والمعد.",
    defaultContent: "{{case.title}}",
    defaultVariant: "hero",
    defaultAlign: "center",
  },
  {
    kind: "meta-strip",
    title: "بيانات مختصرة تحت العنوان",
    description: "تاريخ، معد التقرير، الخدمة، رقم الحالة. تظهر كسطر معلومات اختياري.",
    defaultContent:
      "التاريخ: {{case.createdAt}}\nالمعد: {{identity.counselorName}}\nالخدمة: {{service.name}}\nرقم الحالة: {{case.id}}",
    defaultVariant: "soft",
  },
  {
    kind: "plain-text",
    title: "فقرة بدون عنوان",
    description: "نص عادي داخل التقرير بدون عنوان ظاهر.",
    defaultContent:
      "اكتب هنا نصًا رسميًا، أو اختر نصًا من مكتبة النصوص. يمكنك استخدام متغيرات مثل {{case.title}} و {{student.name}}.",
    defaultVariant: "plain",
  },
  {
    kind: "section-text",
    title: "بلوك نص مع عنوان",
    description: "عنوان صغير وتحته فقرة رسمية.",
    defaultContent:
      "تم توثيق هذا الجزء بناءً على البيانات المدخلة في الحالة، ويمكن ربط النص بمتغيرات ديناميكية من Workflow.",
    defaultVariant: "card",
  },
  {
    kind: "multi-paragraph",
    title: "نص فقرات متعددة",
    description: "مناسب للوصف التفصيلي أو دراسة الحالة أو محاور الاجتماع.",
    defaultContent:
      "الفقرة الأولى: يتم هنا عرض وصف مختصر للسياق العام.\n\nالفقرة الثانية: يتم هنا توضيح الإجراء أو المعالجة أو التوصيات.",
    defaultVariant: "outline",
  },
  {
    kind: "highlight-note",
    title: "بلوك مميز للنتيجة",
    description: "مربع بصري هادئ لإظهار نتيجة أو ملاحظة مهمة.",
    defaultContent:
      "أسهمت الجهود المنفذة في تعزيز الوعي وتحسين مستوى التفاعل الإيجابي داخل البيئة التعليمية.",
    defaultVariant: "highlight",
  },
  {
    kind: "bullet-list",
    title: "قائمة نقاط",
    description: "مناسب للأهداف أو الإجراءات أو التوصيات.",
    defaultContent:
      "تعزيز الوعي لدى الفئة المستهدفة\nتوثيق الإجراءات المتخذة\nمتابعة النتائج خلال الفترة القادمة",
    defaultVariant: "card",
  },
  {
    kind: "dynamic-fields",
    title: "حقول ديناميكية من الحالة",
    description: "يعرض أهم قيم Case ID وWorkflow بشكل مرتب.",
    defaultContent:
      "هذا البلوك يعرض بيانات الحالة والطالب والحقول المتاحة عند اختبار Case ID.",
    defaultVariant: "soft",
  },
  {
    kind: "closing-note",
    title: "خاتمة واعتماد",
    description: "خاتمة رسمية ومساحة اعتماد خفيفة.",
    defaultContent:
      "تم إعداد التقرير واعتماده وفق البيانات المتاحة في منصة التوجيه الطلابي.",
    defaultVariant: "quote",
  },
];

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createBlock(kind: BlockKind): StudioBlock {
  const item = blockLibrary.find((block) => block.kind === kind) || blockLibrary[2];

  return {
    id: makeId(kind),
    kind: item.kind,
    title: item.title,
    content: item.defaultContent,
    variant: item.defaultVariant,
    source: "manual",
    showTitle: item.kind !== "plain-text" && item.kind !== "hero-title",
    showMeta: item.kind === "hero-title" || item.kind === "meta-strip",
    align: item.defaultAlign || "right",
  };
}

function createInitialTemplate(): StudioTemplate {
  return {
    id: "official-smart-single-page-template",
    name: "القالب الرسمي الذكي",
    description:
      "قالب رسمي بصفحة واحدة وهوية ثابتة، يتم بناء محتواه من بلوكات نصية ذكية ومتغيرات ديناميكية.",
    status: "DRAFT",
    scope: "GLOBAL",
    previewCaseId: "",
    documentType: "REPORT",
    updatedAt: "غير محفوظ",
    page: {
      id: "official-smart-page-1",
      title: "صفحة التقرير الرسمية",
      blocks: [
        {
          ...createBlock("hero-title"),
          id: "block-main-title",
          title: "عنوان التقرير",
          content: "{{case.title}}",
        },
        {
          ...createBlock("meta-strip"),
          id: "block-meta",
        },
        {
          ...createBlock("section-text"),
          id: "block-intro",
          title: "مقدمة التقرير",
          content:
            "بناءً على ما تم رصده في {{service.name}}، تم إعداد هذا التقرير لتوثيق الإجراء المتخذ وبيان أبرز النتائج والتوصيات.",
        },
        {
          ...createBlock("highlight-note"),
          id: "block-result",
          title: "نتيجة عامة",
        },
        {
          ...createBlock("bullet-list"),
          id: "block-recommendations",
          title: "التوصيات",
        },
      ],
    },
  };
}

function buildRuntimeContext(template: StudioTemplate, previewCase: PreviewCaseData | null) {
  const values: Record<string, string> = {};

  for (const item of previewCase?.values || []) {
    if (item.fieldKey) {
      values[`field.${item.fieldKey}`] = item.value || "";
    }
  }

  return {
    "identity.ministryName": "وزارة التعليم",
    "identity.educationDepartment": "الإدارة العامة للتعليم",
    "identity.educationOffice": "مكتب التعليم",
    "identity.schoolName": "اسم المدرسة",
    "identity.counselorName": "اسم الموجه/الموجهة",
    "identity.principalName": "اسم مدير/مديرة المدرسة",

    "template.name": template.name,
    "template.description": template.description,

    "case.id": previewCase?.caseId || "CASE-ID",
    "case.title": previewCase?.title || "عنوان التقرير",
    "case.status": previewCase?.status || "مسودة",
    "case.createdAt": formatDate(previewCase?.createdAt) || "1447/01/01 هـ",
    "case.updatedAt": formatDate(previewCase?.updatedAt) || "1447/01/01 هـ",

    "service.name": previewCase?.serviceName || "الخدمة الإرشادية",
    "service.slug": previewCase?.serviceSlug || template.serviceSlug || "general",

    "student.name": previewCase?.student?.name || "اسم الطالب/الطالبة",
    "student.grade": previewCase?.student?.grade || "الصف",
    "student.classroom": previewCase?.student?.classroom || "الفصل",
    "student.stage": previewCase?.student?.stage || "المرحلة",
    "student.guardianName": previewCase?.student?.guardianName || "اسم ولي الأمر",
    "student.guardianPhone": previewCase?.student?.guardianPhone || "رقم ولي الأمر",

    "evidence.count": String(previewCase?.evidences?.length || 0),

    ...values,
  };
}

function formatDate(value?: string) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function renderText(text: string, context: Record<string, string>) {
  return text.replace(/{{\s*([^}]+)\s*}}/g, (_, key: string) => {
    const cleanKey = key.trim();
    return context[cleanKey] || `{{${cleanKey}}}`;
  });
}

function splitLines(text: string) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function splitParagraphs(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function ReportTemplateStudio() {
  const [template, setTemplate] = useState<StudioTemplate>(() => createInitialTemplate());
  const [selectedBlockId, setSelectedBlockId] = useState("block-main-title");
  const [savedTemplateId, setSavedTemplateId] = useState("");
  const [saving, setSaving] = useState(false);
  const [testingCase, setTestingCase] = useState(false);
  const [previewCase, setPreviewCase] = useState<PreviewCaseData | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const selectedBlock = useMemo(
    () => template.page.blocks.find((block) => block.id === selectedBlockId) || null,
    [template.page.blocks, selectedBlockId],
  );

  const runtimeContext = useMemo(
    () => buildRuntimeContext(template, previewCase),
    [template, previewCase],
  );

  function updateTemplate(next: Partial<StudioTemplate>) {
    setTemplate((current) => ({
      ...current,
      ...next,
      updatedAt: new Date().toISOString().slice(0, 10),
    }));
  }

  function updateBlock(blockId: string, updater: (block: StudioBlock) => StudioBlock) {
    setTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString().slice(0, 10),
      page: {
        ...current.page,
        blocks: current.page.blocks.map((block) =>
          block.id === blockId ? updater(block) : block,
        ),
      },
    }));
  }

  function addBlock(kind: BlockKind) {
    const block = createBlock(kind);

    setTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString().slice(0, 10),
      page: {
        ...current.page,
        blocks: [...current.page.blocks, block],
      },
    }));

    setSelectedBlockId(block.id);
  }

  function removeSelectedBlock() {
    if (!selectedBlock || template.page.blocks.length <= 1) {
      return;
    }

    const remaining = template.page.blocks.filter(
      (block) => block.id !== selectedBlock.id,
    );

    setTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString().slice(0, 10),
      page: {
        ...current.page,
        blocks: remaining,
      },
    }));

    setSelectedBlockId(remaining[0]?.id || "");
  }

  function moveBlock(direction: "up" | "down") {
    if (!selectedBlock) return;

    const index = template.page.blocks.findIndex(
      (block) => block.id === selectedBlock.id,
    );

    if (index === -1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= template.page.blocks.length) return;

    const nextBlocks = [...template.page.blocks];
    const [block] = nextBlocks.splice(index, 1);
    nextBlocks.splice(targetIndex, 0, block);

    setTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString().slice(0, 10),
      page: {
        ...current.page,
        blocks: nextBlocks,
      },
    }));
  }

  function applySnippet(snippetId: string) {
    if (!selectedBlock) return;

    const snippet = textSnippets.find((item) => item.id === snippetId);

    if (!snippet) return;

    updateBlock(selectedBlock.id, (block) => ({
      ...block,
      source: "library",
      snippetId,
      title: block.title || snippet.title,
      content: snippet.content,
    }));
  }

  async function runCaseTest() {
    const caseId = template.previewCaseId.trim();

    if (!caseId) {
      setPreviewCase(null);
      setFeedback({
        type: "info",
        message: "لم يتم إدخال Case ID. سيتم عرض بيانات تجريبية داخل المعاينة.",
      });
      return;
    }

    try {
      setTestingCase(true);

      const response = await fetch(
        `/api/admin/report-templates/preview-case?caseId=${encodeURIComponent(
          caseId,
        )}`,
        { cache: "no-store" },
      );

      const result = await response.json();

      setPreviewCase(result?.data || null);
      setFeedback({
        type: result?.data ? "success" : "info",
        message:
          result?.message ||
          "تم تنفيذ الاختبار. إذا لم توجد حالة فعلية ستبقى المعاينة على بيانات تجريبية.",
      });
    } catch {
      setPreviewCase(null);
      setFeedback({
        type: "error",
        message: "تعذر اختبار Case ID. راجع الرقم أو جرّب لاحقًا.",
      });
    } finally {
      setTestingCase(false);
    }
  }

  function toReportTemplateJson(status: TemplateStatus) {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      scope: template.scope,
      serviceSlug: template.serviceSlug || undefined,
      workflowSlug: template.workflowSlug || undefined,
      locationKey: template.locationKey || undefined,
      status,
      documentType: template.documentType,
      designPreset: "official-smart-single-page",
      previewCaseId: template.previewCaseId,
      updatedAt: new Date().toISOString().slice(0, 10),
      officialLayout: {
        pageSize: "A4",
        ministryLogoOnly: true,
        headerLocked: true,
        identityLocked: true,
      },
      pages: [
        {
          id: template.page.id,
          kind: "narrative",
          title: template.page.title,
          description: "صفحة رسمية واحدة ثابتة الهوية وقابلة للبناء بالبلوكات.",
          blocks: template.page.blocks.map((block) => ({
            id: block.id,
            kind: "custom-paragraph",
            title: block.title,
            customTitle: block.showTitle ? block.title : "",
            customContent: block.content,
            required: false,
            source: {
              source: block.source,
              label:
                block.source === "library"
                  ? "مكتبة النصوص"
                  : "كتابة مباشرة",
              description: "بلوك من الاستديو الرسمي الذكي",
              fieldKey: block.kind,
            },
            settings: {
              smartBlockKind: block.kind,
              style: block.variant,
              showTitle: block.showTitle,
              showMeta: block.showMeta,
              align: block.align,
              snippetId: block.snippetId || null,
            },
          })),
        },
      ],
      smartStudio: {
        version: 1,
        mode: "single-official-page",
        blocks: template.page.blocks,
      },
    };
  }

  async function saveTemplate(nextStatus: TemplateStatus = template.status) {
    try {
      setSaving(true);

      const templateJson = toReportTemplateJson(nextStatus);

      const payload = {
        name: template.name || "القالب الرسمي الذكي",
        description: template.description || "قالب رسمي ذكي بصفحة واحدة.",
        serviceSlug: template.scope === "SERVICE" ? template.serviceSlug || null : null,
        type: "SCHOOL",
        content: JSON.stringify(templateJson),
        templateJson,
        genderAware: true,
        isActive: nextStatus !== "ARCHIVED",
      };

      const response = savedTemplateId
        ? await fetch(`/api/dashboard/report-templates/${savedTemplateId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/dashboard/report-templates", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || result?.message || "تعذر حفظ القالب.");
      }

      const nextSavedId =
        result?.template?.id || result?.data?.id || result?.id || savedTemplateId;

      if (nextSavedId) {
        setSavedTemplateId(nextSavedId);
      }

      setTemplate((current) => ({
        ...current,
        status: nextStatus,
        updatedAt: new Date().toISOString().slice(0, 10),
      }));

      setFeedback({
        type: "success",
        message:
          nextStatus === "PUBLISHED"
            ? "تم حفظ القالب ونشره بنجاح."
            : "تم حفظ مسودة القالب بنجاح.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "حدث خطأ غير متوقع أثناء حفظ القالب.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f8f6]" dir="rtl">
      <header className="border-b border-emerald-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1560px] flex-col gap-4 px-6 py-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-black text-emerald-700">
              استديو القوالب الرسمي
            </p>

            <h1 className="mt-1 text-2xl font-black text-slate-950">
              قالب رسمي ذكي بصفحة واحدة
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
              الهوية ثابتة ولا يتم تعديلها. التحكم يكون فقط في البلوكات والنصوص
              والمتغيرات الديناميكية داخل الصفحة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
              {statusLabels[template.status]}
            </span>

            <button
              type="button"
              onClick={() => saveTemplate("DRAFT")}
              disabled={saving}
              className="rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-black text-emerald-800 shadow-sm transition hover:bg-emerald-50 disabled:opacity-60"
            >
              حفظ مسودة
            </button>

            <button
              type="button"
              onClick={() => saveTemplate("PUBLISHED")}
              disabled={saving}
              className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-60"
            >
              حفظ ونشر
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1560px] gap-5 px-6 py-6 xl:grid-cols-[290px_minmax(0,1fr)_360px]">
        <aside className="space-y-4">
          <section className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-black text-slate-900">
              مكتبة البلوكات
            </h2>

            <p className="mt-1 text-xs leading-6 text-slate-500">
              اختر البلوك المناسب. سيتم إضافته داخل الصفحة الرسمية الواحدة.
            </p>

            <div className="mt-4 space-y-2">
              {blockLibrary.map((block) => (
                <button
                  key={block.kind}
                  type="button"
                  onClick={() => addBlock(block.kind)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-right transition hover:border-emerald-300 hover:bg-emerald-50"
                >
                  <strong className="text-xs font-black text-slate-900">
                    {block.title}
                  </strong>

                  <p className="mt-1 text-[11px] leading-5 text-slate-500">
                    {block.description}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-black text-slate-900">
              ترتيب البلوكات
            </h2>

            <div className="mt-4 space-y-2">
              {template.page.blocks.map((block, index) => (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => setSelectedBlockId(block.id)}
                  className={[
                    "w-full rounded-2xl border p-3 text-right transition",
                    block.id === selectedBlockId
                      ? "border-emerald-600 bg-emerald-50"
                      : "border-slate-200 bg-white hover:bg-slate-50",
                  ].join(" ")}
                >
                  <span className="text-[11px] font-black text-slate-400">
                    بلوك {index + 1}
                  </span>
                  <strong className="mt-1 block text-xs font-black text-slate-900">
                    {block.title}
                  </strong>
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => moveBlock("up")}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
              >
                أعلى
              </button>

              <button
                type="button"
                onClick={() => moveBlock("down")}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
              >
                أسفل
              </button>
            </div>

            <button
              type="button"
              onClick={removeSelectedBlock}
              disabled={template.page.blocks.length <= 1}
              className="mt-2 w-full rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              حذف البلوك المحدد
            </button>
          </section>
        </aside>

        <section className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px]">
              <label className="block">
                <span className="text-xs font-black text-slate-500">
                  اسم القالب
                </span>
                <input
                  value={template.name}
                  onChange={(event) => updateTemplate({ name: event.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black text-slate-500">
                  التوجيه
                </span>
                <select
                  value={template.scope}
                  onChange={(event) =>
                    updateTemplate({
                      scope: event.target.value as TemplateScope,
                    })
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
                >
                  <option value="GLOBAL">عام</option>
                  <option value="SERVICE">خدمة</option>
                  <option value="WORKFLOW">Workflow</option>
                  <option value="LOCATION">مكان محدد</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-black text-slate-500">
                  Case ID للاختبار
                </span>
                <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                  <input
                    value={template.previewCaseId}
                    onChange={(event) =>
                      updateTemplate({ previewCaseId: event.target.value })
                    }
                    placeholder="اختياري"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
                  />

                  <button
                    type="button"
                    onClick={runCaseTest}
                    disabled={testingCase}
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    اختبار
                  </button>
                </div>
              </label>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px_220px]">
              <label className="block">
                <span className="text-xs font-black text-slate-500">
                  وصف القالب
                </span>
                <input
                  value={template.description}
                  onChange={(event) =>
                    updateTemplate({ description: event.target.value })
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-emerald-600"
                />
              </label>

              {template.scope === "SERVICE" ? (
                <label className="block">
                  <span className="text-xs font-black text-slate-500">
                    الخدمة
                  </span>
                  <input
                    value={template.serviceSlug || ""}
                    onChange={(event) =>
                      updateTemplate({ serviceSlug: event.target.value })
                    }
                    placeholder="service-slug"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
                  />
                </label>
              ) : null}

              {template.scope === "WORKFLOW" ? (
                <label className="block">
                  <span className="text-xs font-black text-slate-500">
                    Workflow
                  </span>
                  <input
                    value={template.workflowSlug || ""}
                    onChange={(event) =>
                      updateTemplate({ workflowSlug: event.target.value })
                    }
                    placeholder="guardian-summons"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
                  />
                </label>
              ) : null}

              {template.scope === "LOCATION" ? (
                <label className="block">
                  <span className="text-xs font-black text-slate-500">
                    مكان الاستخدام
                  </span>
                  <input
                    value={template.locationKey || ""}
                    onChange={(event) =>
                      updateTemplate({ locationKey: event.target.value })
                    }
                    placeholder="reports.issue"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
                  />
                </label>
              ) : null}
            </div>

            {feedback ? (
              <div
                className={[
                  "mt-4 rounded-2xl px-4 py-3 text-sm font-bold leading-7",
                  feedback.type === "success"
                    ? "bg-emerald-50 text-emerald-700"
                    : feedback.type === "error"
                      ? "bg-red-50 text-red-700"
                      : "bg-slate-50 text-slate-600",
                ].join(" ")}
              >
                {feedback.message}
              </div>
            ) : null}
          </section>

          <OfficialPagePreview
            template={template}
            context={runtimeContext}
            previewCase={previewCase}
          />
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-900">
              إعدادات البلوك
            </h2>

            {selectedBlock ? (
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="text-xs font-black text-slate-500">
                    عنوان البلوك
                  </span>
                  <input
                    value={selectedBlock.title}
                    onChange={(event) =>
                      updateBlock(selectedBlock.id, (block) => ({
                        ...block,
                        title: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3 text-xs font-black text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedBlock.showTitle}
                      onChange={(event) =>
                        updateBlock(selectedBlock.id, (block) => ({
                          ...block,
                          showTitle: event.target.checked,
                        }))
                      }
                    />
                    إظهار العنوان
                  </label>

                  <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3 text-xs font-black text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedBlock.showMeta}
                      onChange={(event) =>
                        updateBlock(selectedBlock.id, (block) => ({
                          ...block,
                          showMeta: event.target.checked,
                        }))
                      }
                    />
                    إظهار معلومات
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs font-black text-slate-500">
                    مصدر النص
                  </span>
                  <select
                    value={selectedBlock.source}
                    onChange={(event) =>
                      updateBlock(selectedBlock.id, (block) => ({
                        ...block,
                        source: event.target.value as TextSource,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
                  >
                    <option value="manual">كتابة مباشرة</option>
                    <option value="library">مكتبة النصوص</option>
                  </select>
                </label>

                {selectedBlock.source === "library" ? (
                  <label className="block">
                    <span className="text-xs font-black text-slate-500">
                      اختر نصًا من المكتبة
                    </span>
                    <select
                      value={selectedBlock.snippetId || ""}
                      onChange={(event) => applySnippet(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
                    >
                      <option value="">اختر النص</option>
                      {textSnippets.map((snippet) => (
                        <option key={snippet.id} value={snippet.id}>
                          {snippet.category} - {snippet.title}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <label className="block">
                  <span className="text-xs font-black text-slate-500">
                    نص البلوك
                  </span>
                  <textarea
                    value={selectedBlock.content}
                    onChange={(event) =>
                      updateBlock(selectedBlock.id, (block) => ({
                        ...block,
                        content: event.target.value,
                      }))
                    }
                    rows={8}
                    className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700 outline-none focus:border-emerald-600"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-xs font-black text-slate-500">
                      التصميم
                    </span>
                    <select
                      value={selectedBlock.variant}
                      onChange={(event) =>
                        updateBlock(selectedBlock.id, (block) => ({
                          ...block,
                          variant: event.target.value as BlockVariant,
                        }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-900 outline-none focus:border-emerald-600"
                    >
                      <option value="hero">عنوان كبير</option>
                      <option value="plain">نص عادي</option>
                      <option value="card">بطاقة</option>
                      <option value="soft">هادئ</option>
                      <option value="highlight">مميز</option>
                      <option value="outline">إطار فقط</option>
                      <option value="quote">خاتمة</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-black text-slate-500">
                      المحاذاة
                    </span>
                    <select
                      value={selectedBlock.align}
                      onChange={(event) =>
                        updateBlock(selectedBlock.id, (block) => ({
                          ...block,
                          align: event.target.value as "right" | "center",
                        }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-900 outline-none focus:border-emerald-600"
                    >
                      <option value="right">يمين</option>
                      <option value="center">وسط</option>
                    </select>
                  </label>
                </div>

                <div className="rounded-2xl bg-emerald-50 p-3 text-xs font-bold leading-6 text-emerald-800">
                  المتغيرات المتاحة: {"{{case.title}}"}، {"{{service.name}}"}،{" "}
                  {"{{student.name}}"}، {"{{field.meetingName}}"}،{" "}
                  {"{{identity.counselorName}}"}.
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                اختر بلوكًا من القائمة لتعديله.
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
            <h3 className="text-sm font-black text-emerald-900">
              الهوية ثابتة
            </h3>

            <p className="mt-2 text-xs font-bold leading-7 text-emerald-800">
              مكان الترويسة، شعار وزارة التعليم، الإطار العام، الحواف، والفوتر
              جزء من التصميم الرسمي ولا يتم تعديلها من الاستديو.
            </p>

            <div className="mt-3 rounded-2xl bg-white p-3 text-xs font-black text-emerald-700">
              التوجيه الحالي: {scopeLabels[template.scope]}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}

function OfficialPagePreview({
  template,
  context,
  previewCase,
}: {
  template: StudioTemplate;
  context: Record<string, string>;
  previewCase: PreviewCaseData | null;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">
            المعاينة الرسمية A4
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            صفحة واحدة ثابتة الهوية. البلوكات فقط تتغير.
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
          {previewCase ? "Case ID فعلي" : "بيانات تجريبية"}
        </span>
      </div>

      <article className="mx-auto min-h-[297mm] w-full max-w-[210mm] overflow-hidden rounded-[28px] border border-emerald-100 bg-[#f1faf5] p-[9mm] shadow-xl">
        <div className="relative min-h-[279mm] rounded-[24px] border border-emerald-100 bg-white p-[12mm]">
          <div className="pointer-events-none absolute inset-4 rounded-[22px] border border-emerald-50" />

          <header className="relative z-10 rounded-[22px] border border-emerald-100 bg-gradient-to-l from-emerald-50 to-white p-5">
            <div className="grid grid-cols-[100px_1fr_150px] items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-100 bg-white p-2">
                <img
                  src="/uploads/school-logos/MOE.png"
                  alt="شعار وزارة التعليم"
                  className="max-h-full max-w-full object-contain"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
                <span className="text-center text-[10px] font-black text-emerald-700">
                  وزارة التعليم
                </span>
              </div>

              <div className="text-center">
                <p className="text-sm font-black text-emerald-900">
                  وزارة التعليم
                </p>
                <p className="mt-1 text-xs font-bold text-slate-600">
                  الإدارة العامة للتعليم · مكتب التعليم
                </p>
                <p className="mt-1 text-xs font-bold text-slate-600">
                  اسم المدرسة
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-white p-3 text-center">
                <p className="text-[10px] font-black text-slate-400">
                  نوع المستند
                </p>
                <p className="mt-1 text-sm font-black text-emerald-800">
                  تقرير رسمي
                </p>
              </div>
            </div>
          </header>

          <main className="relative z-10 mt-6 space-y-4">
            {template.page.blocks.map((block) => (
              <PreviewBlock
                key={block.id}
                block={block}
                context={context}
                previewCase={previewCase}
              />
            ))}
          </main>

          <footer className="absolute bottom-[10mm] left-[12mm] right-[12mm] z-10">
            <div className="h-1 rounded-full bg-gradient-to-l from-emerald-700 to-emerald-200" />
            <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span>منصة التوجيه الطلابي</span>
              <span>تقرير رسمي ذكي</span>
            </div>
          </footer>
        </div>
      </article>
    </section>
  );
}

function PreviewBlock({
  block,
  context,
  previewCase,
}: {
  block: StudioBlock;
  context: Record<string, string>;
  previewCase: PreviewCaseData | null;
}) {
  const rendered = renderText(block.content, context);
  const textAlign = block.align === "center" ? "text-center" : "text-right";

  if (block.kind === "hero-title") {
    return (
      <section className="py-5 text-center">
        <p className="text-xs font-black text-emerald-700">
          {context["service.name"]}
        </p>
        <h1 className="mx-auto mt-3 max-w-[145mm] text-3xl font-black leading-[1.7] text-slate-950">
          {rendered}
        </h1>
        {block.showMeta ? (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] font-black text-slate-500">
            <span className="rounded-full bg-emerald-50 px-3 py-1">
              {context["case.createdAt"]}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1">
              {context["identity.counselorName"]}
            </span>
          </div>
        ) : null}
      </section>
    );
  }

  if (block.kind === "meta-strip") {
    return (
      <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
        <div className="grid gap-2 md:grid-cols-2">
          {splitLines(rendered).map((line) => (
            <div
              key={line}
              className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-bold text-slate-700"
            >
              {line}
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (block.kind === "bullet-list") {
    return (
      <section className={getBlockClass(block.variant, textAlign)}>
        {block.showTitle ? <BlockTitle title={block.title} /> : null}
        <ul className="space-y-2">
          {splitLines(rendered).map((line) => (
            <li key={line} className="flex gap-2 text-sm leading-7 text-slate-700">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (block.kind === "multi-paragraph") {
    return (
      <section className={getBlockClass(block.variant, textAlign)}>
        {block.showTitle ? <BlockTitle title={block.title} /> : null}
        <div className="space-y-3">
          {splitParagraphs(rendered).map((paragraph) => (
            <p key={paragraph} className="text-sm leading-8 text-slate-700">
              {paragraph}
            </p>
          ))}
        </div>
      </section>
    );
  }

  if (block.kind === "dynamic-fields") {
    return (
      <section className={getBlockClass(block.variant, textAlign)}>
        {block.showTitle ? <BlockTitle title={block.title} /> : null}
        <div className="grid gap-2 md:grid-cols-2">
          {[
            ["الخدمة", context["service.name"]],
            ["عنوان الحالة", context["case.title"]],
            ["الطالب/الطالبة", context["student.name"]],
            ["الصف", context["student.grade"]],
            ["ولي الأمر", context["student.guardianName"]],
            ["عدد الشواهد", context["evidence.count"]],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-100 bg-white px-4 py-3"
            >
              <p className="text-[11px] font-black text-slate-400">{label}</p>
              <p className="mt-1 text-sm font-black text-slate-800">
                {value || "غير متوفر"}
              </p>
            </div>
          ))}
        </div>

        {previewCase?.values?.length ? (
          <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs leading-6 text-slate-500">
            تم جلب {previewCase.values.length} قيمة من Case ID.
          </div>
        ) : null}
      </section>
    );
  }

  if (block.kind === "closing-note") {
    return (
      <section className={getBlockClass(block.variant, textAlign)}>
        {block.showTitle ? <BlockTitle title={block.title} /> : null}
        <p className="text-sm leading-8 text-slate-700">{rendered}</p>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black text-slate-400">
              الموجه/الموجهة الطلابية
            </p>
            <p className="mt-4 text-sm font-black text-slate-800">
              {context["identity.counselorName"]}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black text-slate-400">
              مدير/مديرة المدرسة
            </p>
            <p className="mt-4 text-sm font-black text-slate-800">
              {context["identity.principalName"]}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={getBlockClass(block.variant, textAlign)}>
      {block.showTitle ? <BlockTitle title={block.title} /> : null}
      <p className="text-sm leading-8 text-slate-700">{rendered}</p>
    </section>
  );
}

function BlockTitle({ title }: { title: string }) {
  return (
    <h3 className="mb-3 text-base font-black text-slate-950">
      {title}
    </h3>
  );
}

function getBlockClass(variant: BlockVariant, textAlign: string) {
  const base = `break-inside-avoid ${textAlign}`;

  const classes: Record<BlockVariant, string> = {
    hero: `${base} py-5`,
    plain: `${base} px-1 py-2`,
    card: `${base} rounded-3xl border border-slate-200 bg-white p-5 shadow-sm`,
    soft: `${base} rounded-3xl border border-emerald-100 bg-emerald-50 p-5`,
    highlight: `${base} rounded-3xl border border-emerald-200 bg-gradient-to-l from-emerald-50 to-white p-5`,
    outline: `${base} rounded-3xl border border-dashed border-slate-300 bg-white p-5`,
    quote: `${base} rounded-3xl border border-slate-200 bg-slate-50 p-5`,
  };

  return classes[variant];
}
