import type {
  ReportIdentitySettings,
  ReportTemplateBuilderModel,
  ReportTemplateValidationIssue,
  ReportTemplateValidationResult,
  ReportTextSnippet,
} from "@/lib/report-engine/report-template-builder-types";

export function validateReportTemplateForPublishing({
  template,
  identity,
  snippets,
}: {
  template: ReportTemplateBuilderModel;
  identity: ReportIdentitySettings;
  snippets: ReportTextSnippet[];
}): ReportTemplateValidationResult {
  const issues: ReportTemplateValidationIssue[] = [];

  if (!template.name.trim()) {
    issues.push({
      id: "missing-template-name",
      severity: "error",
      title: "اسم القالب مفقود",
      description: "يجب كتابة اسم واضح للقالب قبل نشره.",
    });
  }

  if (!template.description.trim()) {
    issues.push({
      id: "missing-template-description",
      severity: "warning",
      title: "وصف القالب غير مكتمل",
      description: "يفضل إضافة وصف يساعد الأدمن لاحقًا على معرفة استخدام القالب.",
    });
  }

  if (template.scope === "SERVICE" && !template.serviceSlug) {
    issues.push({
      id: "missing-service",
      severity: "error",
      title: "القالب خاص بخدمة بدون تحديد الخدمة",
      description: "اختر الخدمة المرتبطة بالقالب أو اجعل القالب عامًا.",
    });
  }

  if (!template.pages.length) {
    issues.push({
      id: "no-pages",
      severity: "error",
      title: "القالب لا يحتوي على صفحات",
      description: "أضف صفحة واحدة على الأقل قبل النشر.",
    });
  }

  const hasCover = template.pages.some((page) => page.kind === "cover");
  const hasEvidence = template.pages.some((page) =>
    page.blocks.some((block) => block.kind === "evidence-gallery")
  );
  const hasApproval = template.pages.some((page) =>
    page.blocks.some((block) => block.kind === "approval-signature")
  );
  const hasCaseData = template.pages.some((page) =>
    page.blocks.some((block) =>
      ["case-meta", "paragraph", "field-list", "cover-title"].includes(block.kind)
    )
  );

  if (!hasCover) {
    issues.push({
      id: "no-cover",
      severity: "warning",
      title: "لا توجد صفحة غلاف",
      description: "الغلاف اختياري، لكنه مهم للتقارير الرسمية والطباعة.",
    });
  }

  if (!hasCaseData) {
    issues.push({
      id: "no-case-data",
      severity: "error",
      title: "القالب لا يسحب بيانات من الحالة",
      description:
        "أضف بلوكًا مرتبطًا بالحالة مثل بيانات التقارير أو فقرة من بيانات الحالة.",
    });
  }

  if (!hasEvidence) {
    issues.push({
      id: "no-evidence",
      severity: "warning",
      title: "لا يوجد بلوك شواهد",
      description: "قد لا يناسب القالب التقارير التي تتطلب صورًا أو مرفقات.",
    });
  }

  if (!hasApproval) {
    issues.push({
      id: "no-approval",
      severity: "warning",
      title: "لا توجد صفحة اعتماد",
      description: "يفضل إضافة توقيع واعتماد للتقارير الرسمية.",
    });
  }

  template.pages.forEach((page, pageIndex) => {
    if (!page.title.trim()) {
      issues.push({
        id: `page-${page.id}-missing-title`,
        severity: "error",
        title: `صفحة رقم ${pageIndex + 1} بدون عنوان`,
        description: "اكتب عنوانًا واضحًا للصفحة.",
      });
    }

    if (!page.blocks.length) {
      issues.push({
        id: `page-${page.id}-empty`,
        severity: "warning",
        title: `صفحة ${page.title || pageIndex + 1} فارغة`,
        description: "الصفحات الفارغة ستظهر بلا محتوى في التقارير.",
      });
    }

    page.blocks.forEach((block) => {
      if (
        block.source?.source === "caseValues" &&
        !block.source?.fieldKey &&
        ["paragraph", "field-list"].includes(block.kind)
      ) {
        issues.push({
          id: `block-${block.id}-missing-field`,
          severity: "warning",
          title: `مصدر غير محدد: ${block.title}`,
          description:
            "حدد الحقل الذي سيقرأ منه هذا البلوك من Workflow/CaseValue.",
        });
      }

      if (block.kind === "custom-paragraph") {
        if (!block.customTitle?.trim()) {
          issues.push({
            id: `block-${block.id}-missing-custom-title`,
            severity: "warning",
            title: "فقرة مخصصة بدون عنوان",
            description: "يفضل كتابة عنوان للفقرة المخصصة.",
          });
        }

        if (!block.customContent?.trim()) {
          issues.push({
            id: `block-${block.id}-missing-custom-content`,
            severity: "warning",
            title: "فقرة مخصصة بدون محتوى",
            description: "اكتب محتوى الفقرة أو احذفها من القالب.",
          });
        }
      }
    });
  });

  if (!identity.schoolName.trim()) {
    issues.push({
      id: "identity-school-name",
      severity: "error",
      title: "اسم المدرسة مفقود",
      description: "أدخل اسم المدرسة في إعدادات هوية التقارير.",
    });
  }

  if (!identity.counselorName.trim()) {
    issues.push({
      id: "identity-counselor-name",
      severity: "warning",
      title: "اسم الموجه/الموجهة غير محدد",
      description: "يفضل إدخال اسم الموجه/الموجهة في إعدادات الهوية.",
    });
  }

  if (!identity.schoolLeaderName.trim()) {
    issues.push({
      id: "identity-leader-name",
      severity: "warning",
      title: "اسم قائد/قائدة المدرسة غير محدد",
      description: "يفضل إدخال اسم القائد/القائدة للتقارير الرسمية.",
    });
  }

  if (!snippets.length) {
    issues.push({
      id: "no-text-snippets",
      severity: "warning",
      title: "مكتبة النصوص فارغة",
      description:
        "إضافة نصوص جاهزة تساعد الموجه/الموجهة عند إصدار التقارير.",
    });
  }

  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;

  const score = Math.max(0, 100 - errors * 30 - warnings * 8);

  if (!issues.length) {
    issues.push({
      id: "template-ready",
      severity: "success",
      title: "القالب جاهز للنشر",
      description: "لم يتم العثور على مشاكل أساسية في بنية القالب.",
    });
  }

  return {
    canPublish: errors === 0,
    score,
    issues,
  };
}
