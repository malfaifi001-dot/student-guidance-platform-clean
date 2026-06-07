"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ReportDesignRenderer,
  reportDesignTemplates,
  type ReportDesignId,
} from "@/components/report-engine/design-renderers/report-design-renderer";

type PreviewPage = {
  id: string;
  title: string;
  kind: string;
  blocks: Array<Record<string, any>>;
};

function createPreviewPages(): PreviewPage[] {
  return [
    {
      id: "raw-preview-content",
      title: "صفحة تقرير",
      kind: "content",
      blocks: [
        {
          id: "hero",
          kind: "hero-title",
          title: "عنوان التقارير",
          content: "{{case.title}}",
          variant: "hero",
          align: "center",
          showTitle: false,
          showMeta: true,
          placement: "flow",
        },
        {
          id: "meta",
          kind: "meta-strip",
          title: "بيانات مختصرة",
          content:
            "الخدمة: {{service.name}}\nالطالب/الطالبة: {{student.name}}\nالصف: {{student.grade}}\nالمعد: {{identity.counselorName}}",
          variant: "soft",
          align: "right",
          showTitle: false,
          placement: "flow",
        },
        {
          id: "paragraph",
          kind: "multi-paragraph",
          title: "ملخص الحالة",
          content:
            "يعرض هذا التقارير نموذجًا خامًا للتصميم قبل استخدامه داخل الاستديو. الهدف من هذه الصفحة هو معاينة توزيع الترويسة، المحتوى، البطاقات، الهوامش، والفوتر.\n\nيمكن للموجه اختيار التصميم المناسب حسب نوع التقارير: حالة إرشادية، متابعة سلوكية، برنامج إرشادي، شواهد، أو خطاب رسمي.",
          variant: "card",
          align: "right",
          showTitle: true,
          placement: "flow",
        },
        {
          id: "dynamic",
          kind: "dynamic-fields",
          title: "حقول ديناميكية من الحالة",
          content: "",
          variant: "soft",
          align: "right",
          showTitle: true,
          placement: "flow",
        },
        {
          id: "bullets",
          kind: "bullet-list",
          title: "توصيات مقترحة",
          content:
            "متابعة الحالة خلال أسبوعين.\nتوثيق الشواهد المرتبطة بالتدخل.\nإشعار ولي الأمر عند الحاجة.\nرفع ملخص للإدارة بعد إغلاق الحالة.",
          variant: "highlight",
          align: "right",
          showTitle: true,
          placement: "flow",
        },
      ],
    },
    {
      id: "raw-preview-evidence",
      title: "صفحة شواهد",
      kind: "evidence",
      blocks: [
        {
          id: "evidence",
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
      ],
    },
  ];
}

const previewContext: Record<string, string> = {
  "case.id": "CASE-RAW-001",
  "case.title": "تقرير متابعة إرشادية تجريبي",
  "case.createdAt": "1447/07/01 هـ",
  "case.updatedAt": "1447/07/05 هـ",
  "service.name": "التوجيه والإرشاد الطلابي",
  "student.name": "اسم الطالب/الطالبة",
  "student.grade": "ثالث متوسط",
  "student.classroom": "أ",
  "student.stage": "المتوسط",
  "student.guardianName": "اسم ولي الأمر",
  "identity.counselorName": "اسم الموجه/الموجهة",
  "identity.principalName": "اسم مدير/مديرة المدرسة",
  "evidence.count": "4",
};

const previewCase = {
  caseId: "CASE-RAW-001",
  title: "تقرير متابعة إرشادية تجريبي",
  serviceName: "التوجيه والإرشاد الطلابي",
  createdAt: "1447/07/01 هـ",
  student: {
    name: "اسم الطالب/الطالبة",
    grade: "ثالث متوسط",
    classroom: "أ",
    stage: "المتوسط",
    guardianName: "اسم ولي الأمر",
    guardianPhone: "05xxxxxxxx",
  },
  evidences: [],
};

export function ReportDesignGalleryPreview() {
  const [selectedDesignId, setSelectedDesignId] =
    useState<ReportDesignId>("ministry-form");
  const [activePageId, setActivePageId] = useState("raw-preview-content");

  const pages = useMemo(() => createPreviewPages(), []);

  const activePage = pages.find((page) => page.id === activePageId) || pages[0];

  const template = useMemo(
    () => ({
      id: "raw-design-preview",
      name: "معاينة خامة للتصميم",
      title: "معاينة خامة للتصميم",
      status: "DRAFT",
      designTemplateId: selectedDesignId,
      pages,
    }),
    [pages, selectedDesignId],
  );

  const selectedDesign =
    reportDesignTemplates.find((design) => design.id === selectedDesignId) ||
    reportDesignTemplates[0];

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8" dir="rtl">
      <div className="mx-auto max-w-[1800px]">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black text-emerald-700">
              منصة التوجيه الطلابي
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-950">
              معرض التصاميم الخام
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-500">
              عاين شكل التقارير قبل استخدامه في الاستديو. هذه الصفحة تعرض
              التصميم فقط مع بيانات تجريبية، بدون تعديل القالب أو حفظ أي شيء.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/admin/report-templates"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              الرجوع للاستديو
            </Link>

            <Link
              href={`/dashboard/admin/report-templates?designTemplateId=${selectedDesignId}`}
              className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800"
            >
              استخدام هذا التصميم
            </Link>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
          <aside className="space-y-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-black text-slate-900">
                التصاميم المتاحة
              </h2>
              <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                اختر بطاقة لمعاينة التصميم خامًا. الثلاثة البناتية عليها وسم
                "بناتي".
              </p>

              <div className="mt-4 grid gap-3">
                {reportDesignTemplates.map((design) => {
                  const active = selectedDesignId === design.id;

                  return (
                    <button
                      key={design.id}
                      type="button"
                      onClick={() => setSelectedDesignId(design.id)}
                      className={[
                        "rounded-2xl border p-4 text-right transition",
                        active ? design.activeCardClass : design.cardClass,
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <strong className="text-sm font-black text-slate-950">
                            {design.name}
                          </strong>
                          <p className="mt-2 text-xs font-bold leading-6 text-slate-600">
                            {design.description}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full bg-white/80 px-3 py-1 text-[11px] font-black text-slate-600">
                          {design.badge}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-sm font-black text-emerald-900">
                التصميم المحدد
              </p>
              <h3 className="mt-2 text-lg font-black text-slate-950">
                {selectedDesign.name}
              </h3>
              <p className="mt-2 text-xs font-bold leading-6 text-emerald-800">
                {selectedDesign.description}
              </p>

              <Link
                href={`/dashboard/admin/report-templates?designTemplateId=${selectedDesignId}`}
                className="mt-4 block rounded-2xl bg-emerald-700 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-emerald-800"
              >
                استخدام هذا التصميم في الاستديو
              </Link>
            </section>
          </aside>

          <section className="min-w-0">
            <ReportDesignRenderer
              designId={selectedDesignId}
              template={template}
              activePage={activePage}
              activePageId={activePageId}
              context={previewContext}
              previewCase={previewCase}
              onActivePageChange={setActivePageId}
              onAddPage={() => setActivePageId("raw-preview-content")}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
