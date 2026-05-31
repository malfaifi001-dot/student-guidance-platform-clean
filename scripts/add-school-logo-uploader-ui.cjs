const fs = require("fs");

const path = "components/settings/school-settings-form.tsx";
let content = fs.readFileSync(path, "utf8");

/* Add uploading state */
if (!content.includes("const [uploadingLogo, setUploadingLogo]")) {
  content = content.replace(
`  const [saving, setSaving] = useState(false);`,
`  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);`
  );
}

/* Add upload function */
if (!content.includes("async function uploadLogo")) {
  content = content.replace(
`  async function save() {`,
`  async function uploadLogo(file: File | null) {
    setFeedback(null);

    if (!file) return;

    try {
      setUploadingLogo(true);

      const formData = new FormData();
      formData.append("logo", file);

      const response = await fetch("/api/dashboard/settings/school/logo", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر رفع الشعار.");
      }

      setForm((current) => ({
        ...current,
        logoUrl: data.logoUrl,
      }));

      setFeedback({
        type: "success",
        message: "تم رفع شعار المدرسة بنجاح. اضغط حفظ البيانات لتثبيت بقية التعديلات إن وجدت.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "حدث خطأ أثناء رفع الشعار.",
      });
    } finally {
      setUploadingLogo(false);
    }
  }

  async function save() {`
  );
}

/* Add logo upload card before account section */
if (!content.includes("<SchoolLogoUploadCard")) {
  content = content.replace(
`      <ReportIdentityPreviewCard form={form} />

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">`,
`      <ReportIdentityPreviewCard form={form} />

      <SchoolLogoUploadCard
        logoUrl={form.logoUrl}
        uploading={uploadingLogo}
        onUpload={uploadLogo}
        onClear={() => update("logoUrl", "")}
      />

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">`
  );
}

/* Replace old logo input label area if exists */
content = content.replace(
`          <Input
            label="رابط شعار المدرسة"
            value={form.logoUrl}
            onChange={(value) => update("logoUrl", value)}
          />`,
`          <Input
            label="رابط شعار المدرسة"
            value={form.logoUrl}
            onChange={(value) => update("logoUrl", value)}
          />`
);

/* Make preview card show actual image */
content = content.replace(
`        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-xs font-black text-slate-400">
          {form.logoUrl ? "شعار" : "بدون شعار"}
        </div>`,
`        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-xs font-black text-slate-400">
          {form.logoUrl ? (
            <img
              src={form.logoUrl}
              alt="شعار المدرسة"
              className="h-full w-full object-contain p-1"
            />
          ) : (
            "بدون شعار"
          )}
        </div>`
);

/* Add upload component before IdentityReadinessCard */
if (!content.includes("function SchoolLogoUploadCard")) {
  content = content.replace(
`function IdentityReadinessCard({`,
`function SchoolLogoUploadCard({
  logoUrl,
  uploading,
  onUpload,
  onClear,
}: {
  logoUrl: string;
  uploading: boolean;
  onUpload: (file: File | null) => void;
  onClear: () => void;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
          <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="شعار المدرسة"
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <span className="px-4 text-xs font-black leading-6 text-slate-400">
                شعار المدرسة
              </span>
            )}
          </div>

          {logoUrl ? (
            <button
              type="button"
              onClick={onClear}
              className="mt-3 text-xs font-black text-red-600 hover:text-red-700"
            >
              إزالة الشعار
            </button>
          ) : null}
        </div>

        <div>
          <p className="text-sm font-black text-blue-700">شعار المدرسة</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            رفع شعار يظهر في التقارير الرسمية
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
            يفضّل رفع شعار بصيغة PNG بخلفية شفافة أو SVG بجودة عالية. سيظهر الشعار في معاينة الهوية وملفات PDF الرسمية.
          </p>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <label className="block cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center transition hover:bg-slate-50">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  onUpload(file);
                  event.currentTarget.value = "";
                }}
                disabled={uploading}
              />

              <span className="block text-sm font-black text-slate-900">
                {uploading ? "جاري رفع الشعار..." : "اختر شعار المدرسة"}
              </span>

              <span className="mt-1 block text-xs font-bold text-slate-500">
                PNG / JPG / WEBP / SVG — الحد الأقصى 2MB
              </span>
            </label>

            <div className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold leading-6 text-blue-700">
              نصيحة: استخدم صورة مربعة أو شعار شفاف حتى يظهر بشكل أجمل في الغلاف والترويسة.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function IdentityReadinessCard({`
  );
}

fs.writeFileSync(path, content, "utf8");

console.log("تمت إضافة واجهة رفع شعار المدرسة.");
