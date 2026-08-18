"use client";

import { useMemo, useRef, useState } from "react";
import type {
  GeneratedReportSnapshot,
  ReportIdentitySettings,
  ReportTemplateBuilderModel,
  ReportTemplateStatus,
  ReportTextSnippet,
} from "@/lib/report-engine/report-template-builder-types";
import { validateReportTemplateForPublishing } from "@/lib/report-engine/report-template-validation";
import { downloadBlobAsFile } from "@/lib/print-export/print-export-download";

type ReportTemplatePublishToolsProps = {
  template: ReportTemplateBuilderModel;
  identity: ReportIdentitySettings;
  snippets: ReportTextSnippet[];
  snapshots: GeneratedReportSnapshot[];
  onTemplateStatusChange: (status: ReportTemplateStatus) => void;
  onSnapshotCreate: (snapshot: GeneratedReportSnapshot) => void;
};

type FeedbackState = {
  open: boolean;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
};

type PortableTemplatePackage = {
  version: 1;
  exportedAt: string;
  source: "student-guidance-platform-report-template-builder";
  template: ReportTemplateBuilderModel;
  identity: ReportIdentitySettings;
  snippets: ReportTextSnippet[];
};

export function ReportTemplatePublishTools({
  template,
  identity,
  snippets,
  snapshots,
  onTemplateStatusChange,
  onSnapshotCreate,
}: ReportTemplatePublishToolsProps) {
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const [feedback, setFeedback] = useState<FeedbackState>({
    open: false,
    type: "info",
    title: "",
    message: "",
  });

  const validation = useMemo(() => {
    return validateReportTemplateForPublishing({
      template,
      identity,
      snippets,
    });
  }, [template, identity, snippets]);

  const templateStats = useMemo(() => {
    const pagesCount = template.pages.length;
    const blocksCount = template.pages.reduce(
      (total, page) => total + page.blocks.length,
      0
    );

    const textLibraryBlocksCount = template.pages.reduce(
      (total, page) =>
        total +
        page.blocks.filter((block) => block.kind === "text-library").length,
      0
    );

    const evidenceBlocksCount = template.pages.reduce(
      (total, page) =>
        total +
        page.blocks.filter((block) => block.kind === "evidence-gallery").length,
      0
    );

    const serviceSnippetsCount =
      template.scope === "SERVICE" && template.serviceSlug
        ? snippets.filter(
            (snippet) =>
              !snippet.serviceSlug || snippet.serviceSlug === template.serviceSlug
          ).length
        : snippets.length;

    return {
      pagesCount,
      blocksCount,
      textLibraryBlocksCount,
      evidenceBlocksCount,
      serviceSnippetsCount,
      snippetsCount: snippets.length,
      snapshotsCount: snapshots.length,
    };
  }, [template, snippets, snapshots]);

  function openFeedback(
    type: FeedbackState["type"],
    title: string,
    message: string
  ) {
    setFeedback({
      open: true,
      type,
      title,
      message,
    });
  }

  function closeFeedback() {
    setFeedback((current) => ({
      ...current,
      open: false,
    }));
  }

  function publishTemplate() {
    if (!validation.canPublish) {
      openFeedback(
        "warning",
        "القالب غير جاهز للنشر",
        "راجع اختبار القالب أولًا. يوجد أخطاء أو تنبيهات تمنع النشر الآمن للموجهين."
      );
      return;
    }

    onTemplateStatusChange("PUBLISHED");

    openFeedback(
      "success",
      "تم نشر القالب",
      "تم تغيير حالة القالب إلى منشور. لاحقًا سيتم ربط هذا الإجراء بقاعدة البيانات ونسخ الإصدارات."
    );
  }

  function moveToDraft() {
    onTemplateStatusChange("DRAFT");

    openFeedback(
      "info",
      "تم تحويل القالب إلى مسودة",
      "يمكنك الآن تعديل القالب ومراجعة مكتبة النصوص قبل نشره مرة أخرى."
    );
  }

  function archiveTemplate() {
    onTemplateStatusChange("ARCHIVED");

    openFeedback(
      "warning",
      "تم أرشفة القالب",
      "القالب أصبح مؤرشفًا. لاحقًا لن يظهر للموجهين إلا القوالب المنشورة فقط."
    );
  }

  function createSnapshot() {
    const snapshot = {
      id: `report-template-snapshot-${Date.now()}`,
      templateId: template.id,
      templateName: template.name,
      status: template.status,
      createdAt: new Date().toISOString(),
      pagesCount: template.pages.length,
      blocksCount: templateStats.blocksCount,
      snippetsCount: snippets.length,
      template,
      identity,
      snippets,
    } as unknown as GeneratedReportSnapshot;

    onSnapshotCreate(snapshot);

    openFeedback(
      "success",
      "تم إنشاء Snapshot",
      "تم حفظ نسخة لحظية من القالب والهوية ومكتبة النصوص داخل حالة الصفحة الحالية. لاحقًا ستُحفظ هذه النسخة في قاعدة البيانات."
    );
  }

  async function exportTemplatePackage() {
    const packageData: PortableTemplatePackage = {
      version: 1,
      exportedAt: new Date().toISOString(),
      source: "student-guidance-platform-report-template-builder",
      template,
      identity,
      snippets,
    };

    const json = JSON.stringify(packageData, null, 2);
    const blob = new Blob([json], {
      type: "application/json;charset=utf-8",
    });

    const fileName = buildSafeFileName(template.name);
    await downloadBlobAsFile(blob, `${fileName}-${Date.now()}.json`);

    openFeedback(
      "success",
      "تم تصدير القالب",
      "تم تنزيل ملف JSON يحتوي القالب والهوية ومكتبة النصوص. هذا مفيد كنسخة احتياطية أو للنقل لاحقًا."
    );
  }

  async function importTemplatePackage(file: File | null) {
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const packageData = validatePortableTemplatePackage(parsed);

      openFeedback(
        "success",
        "تم قراءة ملف القالب",
        `تم التحقق من الملف بنجاح: ${packageData.template.name}. الاستيراد الحقيقي سيُربط لاحقًا بإنشاء Draft جديد بدل استبدال القالب الحالي مباشرة.`
      );
    } catch (error) {
      openFeedback(
        "error",
        "تعذر استيراد القالب",
        error instanceof Error
          ? error.message
          : "حدث خطأ غير متوقع أثناء قراءة ملف JSON."
      );
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-emerald-700">
            النشر والإصدارات
          </p>

          <h2 className="mt-1 text-xl font-black text-slate-900">
            أدوات نشر القالب وحفظ نسخه
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
            هنا يتم فحص جاهزية القالب، نشره، أرشفته، إنشاء Snapshot، وتصديره أو
            استيراده كملف JSON. لاحقًا سيتم ربط هذه العمليات بقاعدة البيانات
            ونظام Draft / Published / Archived.
          </p>
        </div>

        <TemplateStatusBadge status={template.status} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <MetricCard label="الصفحات" value={templateStats.pagesCount} />
        <MetricCard label="البلوكات" value={templateStats.blocksCount} />
        <MetricCard
          label="بلوكات مكتبة النصوص"
          value={templateStats.textLibraryBlocksCount}
        />
        <MetricCard label="النصوص المتاحة" value={templateStats.snippetsCount} />
      </div>

      <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              جاهزية القالب للنشر
            </h3>

            <p className="mt-1 text-xs leading-6 text-slate-500">
              النشر يجب أن يتم فقط بعد نجاح الفحص حتى لا تظهر للموجهين قوالب
              ناقصة أو غير مترابطة.
            </p>
          </div>

          <div
            className={[
              "rounded-2xl px-4 py-3 text-sm font-black",
              validation.canPublish
                ? "bg-emerald-100 text-emerald-800"
                : "bg-red-100 text-red-800",
            ].join(" ")}
          >
            {validation.score}/100
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <ReadinessCard
            title="حالة النشر"
            value={validation.canPublish ? "جاهز للنشر" : "يحتاج مراجعة"}
            tone={validation.canPublish ? "success" : "danger"}
          />

          <ReadinessCard
            title="نصوص الخدمة"
            value={`${templateStats.serviceSnippetsCount} نص متاح`}
            tone={templateStats.serviceSnippetsCount > 0 ? "success" : "warning"}
          />

          <ReadinessCard
            title="Snapshots"
            value={`${templateStats.snapshotsCount} نسخة`}
            tone={templateStats.snapshotsCount > 0 ? "success" : "neutral"}
          />
        </div>

        {!validation.canPublish ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h4 className="text-xs font-black text-amber-900">
              ملاحظات قبل النشر
            </h4>

            <div className="mt-3 grid gap-2">
              {validation.issues
                .filter((issue) => issue.severity !== "success")
                .slice(0, 4)
                .map((issue) => (
                  <p
                    key={issue.id}
                    className="rounded-xl bg-white/70 px-3 py-2 text-xs leading-6 text-amber-800"
                  >
                    <span className="font-black">{issue.title}: </span>
                    {issue.description}
                  </p>
                ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <ActionButton
          title="نشر القالب"
          description="اعتماد القالب ليكون جاهزًا للموجهين."
          tone="success"
          onClick={publishTemplate}
        />

        <ActionButton
          title="إرجاع لمسودة"
          description="إعادة القالب للتعديل قبل النشر."
          tone="neutral"
          onClick={moveToDraft}
        />

        <ActionButton
          title="أرشفة القالب"
          description="إخفاء القالب من الاستخدام القادم."
          tone="warning"
          onClick={archiveTemplate}
        />
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <ActionButton
          title="إنشاء Snapshot"
          description="حفظ نسخة لحظية من القالب والنصوص."
          tone="primary"
          onClick={createSnapshot}
        />

        <ActionButton
          title="تصدير JSON"
          description="تنزيل القالب والهوية والنصوص كنسخة احتياطية."
          tone="neutral"
          onClick={exportTemplatePackage}
        />

        <ActionButton
          title="استيراد JSON"
          description="قراءة قالب محفوظ وتجهيزه كمسودة لاحقًا."
          tone="neutral"
          onClick={() => importInputRef.current?.click()}
        />

        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0] || null;
            importTemplatePackage(file);
            event.currentTarget.value = "";
          }}
        />
      </div>

      <SnapshotsList snapshots={snapshots} />

      {feedback.open ? (
        <SmartFeedbackModal
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          onClose={closeFeedback}
        />
      ) : null}
    </section>
  );
}

function TemplateStatusBadge({ status }: { status: ReportTemplateStatus }) {
  const config =
    status === "PUBLISHED"
      ? {
          label: "منشور",
          className: "bg-emerald-100 text-emerald-800",
        }
      : status === "ARCHIVED"
        ? {
            label: "مؤرشف",
            className: "bg-amber-100 text-amber-800",
          }
        : {
            label: "مسودة",
            className: "bg-slate-100 text-slate-700",
          };

  return (
    <span
      className={[
        "rounded-2xl px-4 py-3 text-sm font-black",
        config.className,
      ].join(" ")}
    >
      {config.label}
    </span>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function ReadinessCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "success" | "warning" | "danger" | "neutral";
}) {
  const toneClass = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-red-200 bg-red-50 text-red-800",
    neutral: "border-slate-200 bg-white text-slate-700",
  }[tone];

  return (
    <div className={["rounded-2xl border p-4", toneClass].join(" ")}>
      <p className="text-xs font-black opacity-80">{title}</p>
      <p className="mt-2 text-sm font-black">{value}</p>
    </div>
  );
}

function ActionButton({
  title,
  description,
  tone,
  onClick,
}: {
  title: string;
  description: string;
  tone: "primary" | "success" | "warning" | "neutral";
  onClick: () => void;
}) {
  const toneClass = {
    primary: "border-sky-100 bg-sky-50 text-sky-800 hover:bg-sky-100",
    success:
      "border-emerald-100 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
    warning: "border-amber-100 bg-amber-50 text-amber-800 hover:bg-amber-100",
    neutral: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-3xl border p-4 text-right transition",
        toneClass,
      ].join(" ")}
    >
      <strong className="text-sm font-black">{title}</strong>
      <p className="mt-2 text-xs leading-6 opacity-80">{description}</p>
    </button>
  );
}

function SnapshotsList({
  snapshots,
}: {
  snapshots: GeneratedReportSnapshot[];
}) {
  if (!snapshots.length) {
    return (
      <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <h3 className="text-sm font-black text-slate-900">
          لا توجد Snapshots بعد
        </h3>

        <p className="mt-2 text-sm leading-7 text-slate-500">
          أنشئ Snapshot قبل النشر أو قبل أي تعديل كبير حتى تحتفظ بنسخة مرجعية
          من القالب.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900">
            النسخ المحفوظة Snapshot
          </h3>

          <p className="mt-1 text-xs leading-6 text-slate-500">
            هذه قائمة مؤقتة داخل واجهة البيلدر، وستنتقل لاحقًا إلى قاعدة
            البيانات مع نظام الإصدارات.
          </p>
        </div>

        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
          {snapshots.length} نسخة
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        {snapshots.slice(0, 5).map((snapshot, index) => {
          const normalized = normalizeSnapshot(snapshot, index);

          return (
            <div
              key={normalized.id}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-900">
                    {normalized.title}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {normalized.createdAt}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-[11px] font-black">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                    {normalized.status}
                  </span>

                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                    {normalized.pagesCount} صفحات
                  </span>

                  <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-700">
                    {normalized.snippetsCount} نصوص
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SmartFeedbackModal({
  type,
  title,
  message,
  onClose,
}: {
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  onClose: () => void;
}) {
  const config = {
    success: {
      icon: "✓",
      iconClass: "bg-emerald-50 text-emerald-700",
      buttonClass: "bg-emerald-800 hover:bg-emerald-900",
    },
    error: {
      icon: "!",
      iconClass: "bg-red-50 text-red-700",
      buttonClass: "bg-red-600 hover:bg-red-700",
    },
    warning: {
      icon: "!",
      iconClass: "bg-amber-50 text-amber-700",
      buttonClass: "bg-amber-600 hover:bg-amber-700",
    },
    info: {
      icon: "i",
      iconClass: "bg-sky-50 text-sky-700",
      buttonClass: "bg-sky-700 hover:bg-sky-800",
    },
  }[type];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div
          className={[
            "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-black",
            config.iconClass,
          ].join(" ")}
        >
          {config.icon}
        </div>

        <div className="mt-4 text-center">
          <h2 className="text-xl font-black text-slate-900">{title}</h2>

          <p className="mt-3 text-sm leading-7 text-slate-500">{message}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className={[
            "mt-6 w-full rounded-2xl px-4 py-3 text-sm font-black text-white transition",
            config.buttonClass,
          ].join(" ")}
        >
          إغلاق
        </button>
      </div>
    </div>
  );
}

function buildSafeFileName(value: string) {
  const cleaned = value
    .replace(/[^\u0600-\u06FFa-zA-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);

  return cleaned || "report-template";
}

function validatePortableTemplatePackage(
  value: unknown
): PortableTemplatePackage {
  if (!value || typeof value !== "object") {
    throw new Error("ملف القالب غير صالح.");
  }

  const packageData = value as Partial<PortableTemplatePackage>;

  if (packageData.version !== 1) {
    throw new Error("إصدار ملف القالب غير مدعوم.");
  }

  if (
    packageData.source !==
    "student-guidance-platform-report-template-builder"
  ) {
    throw new Error("مصدر ملف القالب غير معروف.");
  }

  if (!packageData.template || typeof packageData.template !== "object") {
    throw new Error("الملف لا يحتوي على بيانات قالب صحيحة.");
  }

  if (!packageData.identity || typeof packageData.identity !== "object") {
    throw new Error("الملف لا يحتوي على إعدادات هوية صحيحة.");
  }

  if (!Array.isArray(packageData.snippets)) {
    throw new Error("الملف لا يحتوي على مكتبة نصوص صحيحة.");
  }

  return packageData as PortableTemplatePackage;
}

function normalizeSnapshot(snapshot: GeneratedReportSnapshot, index: number) {
  const value = snapshot as unknown as {
    id?: string;
    templateName?: string;
    name?: string;
    title?: string;
    createdAt?: string;
    status?: string;
    pagesCount?: number;
    snippetsCount?: number;
  };

  return {
    id: value.id || `snapshot-${index}`,
    title: value.templateName || value.name || value.title || `Snapshot ${index + 1}`,
    createdAt: value.createdAt
      ? formatDateTime(value.createdAt)
      : "وقت غير محدد",
    status: value.status || "محفوظ",
    pagesCount: value.pagesCount || 0,
    snippetsCount: value.snippetsCount || 0,
  };
}

function formatDateTime(value: string) {
  try {
    return new Date(value).toLocaleString("ar-SA");
  } catch {
    return value;
  }
}
