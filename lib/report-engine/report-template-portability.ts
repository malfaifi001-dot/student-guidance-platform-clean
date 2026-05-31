import type {
  ReportIdentitySettings,
  ReportTemplateBuilderModel,
  ReportTextSnippet,
} from "@/lib/report-engine/report-template-builder-types";

export type ReportTemplatePortablePackage = {
  version: 1;
  exportedAt: string;
  template: ReportTemplateBuilderModel;
  identity: ReportIdentitySettings;
  snippets: ReportTextSnippet[];
};

export function createReportTemplatePortablePackage(params: {
  template: ReportTemplateBuilderModel;
  identity: ReportIdentitySettings;
  snippets: ReportTextSnippet[];
}): ReportTemplatePortablePackage {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    template: params.template,
    identity: params.identity,
    snippets: params.snippets,
  };
}

export function downloadReportTemplatePackage(params: {
  template: ReportTemplateBuilderModel;
  identity: ReportIdentitySettings;
  snippets: ReportTextSnippet[];
}) {
  const packageData = createReportTemplatePortablePackage(params);
  const json = JSON.stringify(packageData, null, 2);
  const blob = new Blob([json], {
    type: "application/json;charset=utf-8",
  });

  const safeName = params.template.name
    .replace(/[^\u0600-\u06FFa-zA-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${safeName || "report-template"}-${Date.now()}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

export async function readReportTemplatePackageFromFile(
  file: File
): Promise<ReportTemplatePortablePackage> {
  const text = await file.text();
  const parsed = JSON.parse(text) as unknown;

  return validatePortablePackage(parsed);
}

function validatePortablePackage(
  value: unknown
): ReportTemplatePortablePackage {
  if (!value || typeof value !== "object") {
    throw new Error("ملف القالب غير صالح.");
  }

  const packageData = value as Partial<ReportTemplatePortablePackage>;

  if (packageData.version !== 1) {
    throw new Error("إصدار ملف القالب غير مدعوم.");
  }

  if (!packageData.template || typeof packageData.template !== "object") {
    throw new Error("ملف القالب لا يحتوي على template صالح.");
  }

  if (!packageData.identity || typeof packageData.identity !== "object") {
    throw new Error("ملف القالب لا يحتوي على identity صالح.");
  }

  if (!Array.isArray(packageData.snippets)) {
    throw new Error("ملف القالب لا يحتوي على snippets صالحة.");
  }

  return packageData as ReportTemplatePortablePackage;
}