const fs = require("fs");

const path = "components\\report-engine\\design-renderers\\report-design-renderer.tsx";
let content = fs.readFileSync(path, "utf8");

function replaceNamedFunction(source, functionName, replacement) {
  const needle = "function " + functionName;
  const start = source.indexOf(needle);

  if (start === -1) {
    throw new Error("لم أجد الدالة: " + functionName);
  }

  const braceStart = source.indexOf("{", start);

  if (braceStart === -1) {
    throw new Error("لم أجد بداية جسم الدالة: " + functionName);
  }

  let depth = 0;
  let end = -1;

  for (let index = braceStart; index < source.length; index += 1) {
    const char = source[index];

    if (char === "{") depth += 1;

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        end = index + 1;
        break;
      }
    }
  }

  if (end === -1) {
    throw new Error("لم أستطع تحديد نهاية الدالة: " + functionName);
  }

  return source.slice(0, start) + replacement + source.slice(end);
}

/* 1) Final template normalization with real runtime binding */
content = replaceNamedFunction(
  content,
  "normalizeFinalReportTemplate",
  String.raw`function normalizeFinalReportTemplate(
  template: any,
  editorialBlocks: Record<string, string>,
) {
  const pages = Array.isArray(template?.pages) ? template.pages : [];

  return {
    ...template,
    pages: pages.map((page: any, pageIndex: number) => {
      const pageBlocks = Array.isArray(page?.blocks) ? page.blocks : [];

      const normalizedBlocks = pageBlocks.map((block: any, blockIndex: number) =>
        normalizeFinalReportBlock(template, block, blockIndex, editorialBlocks),
      );

      const shouldAddEvidenceBlock =
        page?.kind === "evidence" &&
        !normalizedBlocks.some((block: any) => block.kind === "evidence-gallery");

      return {
        ...page,
        id: page?.id || "final-page-" + (pageIndex + 1),
        title: page?.title || "صفحة " + (pageIndex + 1),
        kind: page?.kind || "content",
        blocks: shouldAddEvidenceBlock
          ? [
              ...normalizedBlocks,
              {
                id: "auto-evidence-gallery-" + (pageIndex + 1),
                kind: "evidence-gallery",
                title: "الشواهد والمرفقات",
                content: "",
                variant: "card",
                align: "right",
                showTitle: true,
                placement: "flow",
                evidenceLayout: "GRID_2X2",
                evidenceFit: "contain",
                evidenceAspectRatio: "LANDSCAPE_4_3",
                evidenceShowCaptions: true,
                evidenceAutoCreatePages: true,
                evidenceEmptyBehavior: "message",
              },
            ]
          : normalizedBlocks,
      };
    }),
  };
}`
);

content = replaceNamedFunction(
  content,
  "normalizeFinalReportBlock",
  String.raw`function normalizeFinalReportBlock(
  template: any,
  block: any,
  index: number,
  editorialBlocks: Record<string, string>,
) {
  const settings = block?.settings || {};
  const textLibrary = settings.textLibrary || {};

  const rawKind =
    settings.smartBlockKind ||
    block?.smartBlockKind ||
    block?.kind ||
    "paragraph";

  const blockId = block?.id || "final-block-" + (index + 1);

  const editedContent =
    editorialBlocks[blockId] ||
    editorialBlocks[rawKind] ||
    editorialBlocks[block?.title] ||
    "";

  const normalizedKind = normalizeFinalBlockKind(rawKind);

  const resolvedContent =
    editedContent ||
    resolveFinalBlockContent({
      template,
      block,
      settings,
      textLibrary,
      rawKind,
    });

  return {
    ...block,
    id: blockId,
    originalKind: rawKind,
    kind: normalizedKind,
    finalFieldGroup: settings.fieldGroup || rawKind,
    title:
      block?.customTitle ||
      block?.title ||
      settings.title ||
      getDefaultFinalBlockTitle(rawKind),
    content: resolvedContent,
    variant: block?.variant || settings.style || "card",
    align: block?.align || settings.align || "right",
    showTitle:
      typeof block?.showTitle === "boolean"
        ? block.showTitle
        : settings.showTitle !== false,
    showMeta:
      typeof block?.showMeta === "boolean"
        ? block.showMeta
        : settings.showMeta !== false,
    placement: block?.placement || settings.placement || "flow",
    snippetId:
      block?.snippetId ||
      settings.snippetId ||
      textLibrary.snippetId ||
      null,

    fieldKeys:
      block?.fieldKeys ||
      settings.fieldKeys ||
      settings.selectedFieldKeys ||
      settings.workflowFieldKeys ||
      [],

    evidenceLayout:
      block?.evidenceLayout || settings.evidenceLayout || "GRID_2X2",
    evidenceFit: block?.evidenceFit || settings.evidenceFit || "contain",
    evidenceAspectRatio:
      block?.evidenceAspectRatio ||
      settings.evidenceAspectRatio ||
      "LANDSCAPE_4_3",
    evidenceShowCaptions:
      typeof block?.evidenceShowCaptions === "boolean"
        ? block.evidenceShowCaptions
        : settings.evidenceShowCaptions !== false,
    evidenceAutoCreatePages:
      typeof block?.evidenceAutoCreatePages === "boolean"
        ? block.evidenceAutoCreatePages
        : settings.evidenceAutoCreatePages !== false,
    evidenceEmptyBehavior:
      block?.evidenceEmptyBehavior ||
      settings.evidenceEmptyBehavior ||
      "message",
  };
}`
);

/* 2) Robust context binding */
content = replaceNamedFunction(
  content,
  "buildFinalReportContext",
  String.raw`function buildFinalReportContext(
  previewCaseData: PreviewCaseData | null,
  identity: Record<string, any>,
) {
  const data = (previewCaseData || {}) as any;
  const student = data.student || data.caseEntry?.student || {};
  const service = data.service || data.caseEntry?.service || {};

  const caseTitle =
    data.title ||
    data.caseEntry?.title ||
    data.values?.reportTitle ||
    data.values?.caseTitle ||
    "تقرير رسمي";

  const serviceName =
    data.serviceName ||
    service.name ||
    data.caseEntry?.service?.name ||
    "";

  const studentName =
    student.name ||
    student.fullName ||
    data.studentName ||
    "";

  const context: Record<string, string> = {
    "case.id": data.caseId || data.id || data.caseEntry?.id || "",
    "case.title": caseTitle,
    "case.status": data.status || data.caseEntry?.status || "",
    "case.createdAt": formatFinalDate(data.createdAt || data.caseEntry?.createdAt),
    "case.updatedAt": formatFinalDate(data.updatedAt),

    caseId: data.caseId || data.id || data.caseEntry?.id || "",
    caseTitle,
    reportTitle: caseTitle,

    "service.name": serviceName,
    "service.slug": data.serviceSlug || service.slug || data.caseEntry?.service?.slug || "",
    serviceName,
    serviceSlug: data.serviceSlug || service.slug || "",

    "student.name": studentName,
    "student.grade": student.grade || data.studentGrade || "",
    "student.classroom": student.classroom || data.studentClassroom || "",
    "student.stage": student.stage || "",
    "student.guardianName": student.guardianName || data.guardianName || "",
    "student.guardianPhone": student.guardianPhone || data.guardianPhone || "",

    studentName,
    studentGrade: student.grade || "",
    studentClassroom: student.classroom || "",
    studentStage: student.stage || "",
    guardianName: student.guardianName || "",
    guardianPhone: student.guardianPhone || "",

    "identity.schoolName": identity.schoolName || identity.school?.name || "",
    "identity.ministryName": identity.ministryName || "وزارة التعليم",
    "identity.counselorName": identity.counselorName || identity.counselor?.name || "",
    "identity.principalName":
      identity.principalName ||
      identity.schoolLeaderName ||
      identity.school?.principalName ||
      "",
    "identity.educationDepartment": identity.educationDepartment || "",
    "identity.educationOffice": identity.educationOffice || "",
    "identity.academicYear": identity.academicYear || "",
    "identity.semester": identity.semester || "",

    schoolName: identity.schoolName || identity.school?.name || "",
    ministryName: identity.ministryName || "وزارة التعليم",
    counselorName: identity.counselorName || identity.counselor?.name || "",
    principalName:
      identity.principalName ||
      identity.schoolLeaderName ||
      identity.school?.principalName ||
      "",

    "evidence.count": String(data.evidences?.length || 0),
    evidenceCount: String(data.evidences?.length || 0),
    evidenceCountText: formatFinalEvidenceCount(data.evidences?.length || 0),
  };

  for (const value of collectFinalValues(data)) {
    const key = value.fieldKey || "";
    const label = value.fieldLabel || "";
    const itemValue = value.value || "";

    if (key) {
      context["field." + key] = itemValue;
      context[key] = itemValue;
    }

    if (label) {
      context["field." + label] = itemValue;
      context[label] = itemValue;
    }
  }

  if (!context.programTitle) {
    context.programTitle =
      context.program_name ||
      context["field.program_name"] ||
      context["عنوان البرنامج"] ||
      caseTitle;
  }

  if (!context.executionDate) {
    context.executionDate =
      context.gregorian_date ||
      context.execution_date ||
      context["تاريخ التنفيذ"] ||
      context["case.createdAt"];
  }

  if (!context.dayText) {
    context.dayText = context.day || context["اليوم"] || "";
  }

  if (!context.targetGroup) {
    context.targetGroup =
      context.beneficiaries ||
      context.target_group ||
      context["الفئة المستهدفة"] ||
      context["student.grade"] ||
      "";
  }

  if (!context.executionAction) {
    context.executionAction =
      context.execution_action ||
      context["الإجراء التنفيذي"] ||
      "";
  }

  if (!context.executionMechanism) {
    context.executionMechanism =
      context.execution_mechanism ||
      context["آلية التنفيذ"] ||
      "";
  }

  if (!context.performanceIndicator) {
    context.performanceIndicator =
      context.performance_indicator ||
      context["مؤشر الأداء"] ||
      "";
  }

  if (!context.evidenceSuggestion) {
    context.evidenceSuggestion =
      context.evidence_suggestion ||
      context["الشاهد المقترح"] ||
      context["الشواهد"] ||
      "";
  }

  return context;
}`
);

/* 3) Replace renderText so it supports {{x}} and {x} */
content = replaceNamedFunction(
  content,
  "renderText",
  String.raw`function renderText(text: string, context: Record<string, string>) {
  const source = String(text || "");

  const replaceVariable = (_match: string, key: string) => {
    const cleanKey = String(key || "").trim();

    if (!cleanKey) {
      return "";
    }

    return resolveContextVariable(cleanKey, context);
  };

  return source
    .replace(/\{\{\s*([^}]+?)\s*\}\}/g, replaceVariable)
    .replace(/\{([A-Za-z0-9_.\-\u0600-\u06FF ]+)\}/g, replaceVariable);
}`
);

/* 4) Add field-list renderer inside DesignBlock */
if (!content.includes('if (block.kind === "field-list")')) {
  content = content.replace(
    '  if (block.kind === "evidence-gallery") {',
    String.raw`  if (block.kind === "field-list") {
    const values = getFinalFieldListItems(block, previewCase);

    return (
      <section className={getBlockShellClass(designId, block.variant, textAlign)}>
        {block.showTitle ? <BlockTitle title={block.title} /> : null}

        {values.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {values.map((item) => (
              <MetaCard
                key={item.key || item.label}
                label={item.label}
                value={item.value || "غير متوفر"}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
            لا توجد قيم مرتبطة بهذا البلوك.
          </p>
        )}
      </section>
    );
  }

  if (block.kind === "evidence-gallery") {`
  );
}

/* 5) Add final runtime helpers before formatFinalDate */
if (!content.includes("function normalizeFinalBlockKind")) {
  const helper = String.raw`
function normalizeFinalBlockKind(kind: string) {
  if (kind === "cover-title") return "hero-title";
  if (kind === "paragraph") return "multi-paragraph";
  if (kind === "custom-paragraph") return "multi-paragraph";
  if (kind === "text-library") return "multi-paragraph";
  if (kind === "case-meta") return "field-list";
  if (kind === "student-summary") return "field-list";
  if (kind === "service-summary") return "field-list";
  if (kind === "field-list") return "field-list";
  if (kind === "approval-signature") return "closing-note";
  if (kind === "identity-header") return "section-text";

  return kind;
}

function getDefaultFinalBlockTitle(kind: string) {
  if (kind === "cover-title") return "عنوان التقرير";
  if (kind === "case-meta") return "بيانات الحالة";
  if (kind === "student-summary") return "بيانات الطالب/الطالبة";
  if (kind === "service-summary") return "بيانات الخدمة";
  if (kind === "field-list") return "حقول من الحالة";
  if (kind === "text-library") return "نص من مكتبة النصوص";
  if (kind === "custom-paragraph") return "فقرة مخصصة";
  if (kind === "evidence-gallery") return "الشواهد والمرفقات";
  if (kind === "approval-signature") return "الاعتماد";

  return "بلوك التقرير";
}

function resolveFinalBlockContent({
  template,
  block,
  settings,
  textLibrary,
  rawKind,
}: {
  template: any;
  block: any;
  settings: any;
  textLibrary: any;
  rawKind: string;
}) {
  if (rawKind === "cover-title") {
    return block?.content || settings?.content || "{{case.title}}";
  }

  if (rawKind === "custom-paragraph") {
    return block?.customContent || block?.content || settings?.content || "";
  }

  if (rawKind === "paragraph") {
    return block?.content || settings?.content || "";
  }

  if (rawKind === "text-library") {
    return resolveFinalTextLibraryContent(template, block, settings, textLibrary);
  }

  return (
    block?.content ||
    settings?.content ||
    block?.customContent ||
    block?.defaultContent ||
    ""
  );
}

function resolveFinalTextLibraryContent(
  template: any,
  block: any,
  settings: any,
  textLibrary: any,
) {
  const snippets = collectFinalTextSnippets(template);
  const snippetId =
    textLibrary?.snippetId ||
    settings?.snippetId ||
    block?.snippetId ||
    "";

  if (snippetId) {
    const selected = snippets.find((snippet: any) => snippet.id === snippetId);

    if (selected) {
      return selected.content || selected.text || selected.body || "";
    }
  }

  const category =
    textLibrary?.category ||
    settings?.category ||
    block?.category ||
    "مقدمة";

  const serviceSlug =
    textLibrary?.serviceSlug ||
    settings?.serviceSlug ||
    template?.serviceSlug ||
    "";

  const matching = snippets.find((snippet: any) => {
    const matchesCategory =
      !category ||
      category === "all" ||
      snippet.category === category;

    const matchesService =
      !serviceSlug ||
      !snippet.serviceSlug ||
      snippet.serviceSlug === serviceSlug;

    return matchesCategory && matchesService;
  });

  if (matching) {
    return matching.content || matching.text || matching.body || "";
  }

  return getFinalTextLibraryFallback(category);
}

function collectFinalTextSnippets(template: any) {
  const candidates = [
    template?.snippets,
    template?.textSnippets,
    template?.textLibrary,
    template?.library?.snippets,
    template?.settings?.snippets,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function getFinalTextLibraryFallback(category: string) {
  if (category === "هدف") {
    return "يهدف هذا التقرير إلى توثيق {{service.name}} للحالة {{case.title}}، وبيان أبرز البيانات والإجراءات المرتبطة بها.";
  }

  if (category === "إجراء") {
    return "تم تنفيذ الإجراءات المرتبطة بالحالة وفق البيانات المدخلة في النظام، مع توثيق ما يلزم من شواهد ومرفقات.";
  }

  if (category === "نتيجة") {
    return "تشير البيانات المدخلة إلى أن الحالة تم التعامل معها ضمن خدمة {{service.name}}، مع حفظ النتائج والتوصيات داخل التقرير.";
  }

  if (category === "توصية") {
    return "يوصى بمتابعة الحالة حسب الحاجة، وتحديث السجل عند وجود مستجدات، وربط الشواهد الداعمة بالتقرير.";
  }

  if (category === "خاتمة") {
    return "تم إعداد هذا التقرير من منصة التوجيه الطلابي اعتمادًا على بيانات الحالة والشواهد المرتبطة بها.";
  }

  return "تم إعداد هذا التقرير لخدمة {{service.name}} بناءً على بيانات الحالة {{case.title}} والشواهد المرتبطة بها.";
}

function collectFinalValues(data: any) {
  if (Array.isArray(data?.values)) {
    return data.values.map((item: any) => ({
      fieldKey: item.fieldKey || item.key || "",
      fieldLabel: item.fieldLabel || item.label || item.fieldKey || "",
      value:
        item.value === undefined || item.value === null
          ? ""
          : String(item.value),
    }));
  }

  if (data?.values && typeof data.values === "object") {
    return Object.entries(data.values).map(([key, value]) => ({
      fieldKey: key,
      fieldLabel: key,
      value:
        value === undefined || value === null
          ? ""
          : String(value),
    }));
  }

  return [];
}

function resolveContextVariable(key: string, context: Record<string, string>) {
  const aliases: Record<string, string[]> = {
    reportTitle: ["reportTitle", "case.title", "caseTitle"],
    caseTitle: ["case.title", "caseTitle", "reportTitle"],
    serviceName: ["service.name", "serviceName"],
    studentName: ["student.name", "studentName"],
    studentGrade: ["student.grade", "studentGrade"],
    studentClassroom: ["student.classroom", "studentClassroom"],
    guardianName: ["student.guardianName", "guardianName"],
    guardianPhone: ["student.guardianPhone", "guardianPhone"],
    schoolName: ["identity.schoolName", "schoolName"],
    counselorName: ["identity.counselorName", "counselorName"],
    principalName: ["identity.principalName", "principalName"],
  };

  const lookupKeys = [
    key,
    ...(aliases[key] || []),
    key.startsWith("field.") ? key : "field." + key,
  ];

  for (const lookupKey of lookupKeys) {
    const value = context[lookupKey];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }

  return "";
}

function getFinalFieldListItems(block: any, previewCaseData: PreviewCaseData | null) {
  const data = (previewCaseData || {}) as any;
  const values = collectFinalValues(data);
  const group = block.finalFieldGroup || block.originalKind || "";
  const selectedKeys = Array.isArray(block.fieldKeys) ? block.fieldKeys : [];

  if (group === "case-meta") {
    return [
      {
        key: "service",
        label: "الخدمة",
        value: data.serviceName || data.service?.name || data.caseEntry?.service?.name || "",
      },
      {
        key: "case-title",
        label: "الحالة",
        value: data.title || data.caseEntry?.title || "",
      },
      {
        key: "status",
        label: "الحالة الحالية",
        value: data.status || data.caseEntry?.status || "",
      },
      {
        key: "created-at",
        label: "تاريخ الإنشاء",
        value: formatFinalDate(data.createdAt || data.caseEntry?.createdAt),
      },
    ];
  }

  if (group === "student-summary") {
    const student = data.student || data.caseEntry?.student || {};

    return [
      {
        key: "student-name",
        label: "الطالب/الطالبة",
        value: student.name || student.fullName || "",
      },
      {
        key: "grade",
        label: "الصف",
        value: student.grade || "",
      },
      {
        key: "classroom",
        label: "الفصل",
        value: student.classroom || "",
      },
      {
        key: "guardian",
        label: "ولي الأمر",
        value: student.guardianName || "",
      },
    ];
  }

  if (selectedKeys.length) {
    return values
      .filter((item) =>
        selectedKeys.some(
          (key: string) =>
            key === item.fieldKey ||
            key === item.fieldLabel ||
            "field." + key === item.fieldKey,
        ),
      )
      .map((item) => ({
        key: item.fieldKey,
        label: item.fieldLabel || item.fieldKey,
        value: item.value,
      }));
  }

  return values.slice(0, 10).map((item) => ({
    key: item.fieldKey,
    label: item.fieldLabel || item.fieldKey,
    value: item.value,
  }));
}

function formatFinalEvidenceCount(count: number) {
  if (count <= 0) return "0 شاهد";
  if (count === 1) return "شاهد واحد";
  if (count === 2) return "شاهدان";
  if (count >= 3 && count <= 10) return count + " شواهد";

  return count + " شاهد";
}

`;

  content = content.replace("function formatFinalDate", helper + "\nfunction formatFinalDate");
}

fs.writeFileSync(path, content, "utf8");
console.log("Final report runtime binding fixed.");
