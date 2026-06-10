"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, UploadCloud } from "lucide-react";

type FieldOption = {
  id: string;
  label: string;
  value: string;
  order: number;
};

type RuntimeField = {
  id: string;
  key: string;
  label: string;
  type: string;
  placeholder?: string | null;
  helpText?: string | null;
  isRequired: boolean;
  order: number;
  options: FieldOption[];
};

type RuntimeStep = {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  fields: RuntimeField[];
};

type Workflow = {
  id: string;
  name: string;
  serviceSlug: string;
  steps: RuntimeStep[];
};

type EvidenceItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
};

type Props = {
  token: string;
  workflow: Workflow;
  teacherName: string;
  domainTitle: string;
};

function isFileField(field: RuntimeField) {
  return field.type === "FILE_UPLOAD" || field.type === "IMAGE_UPLOAD";
}

function isEmpty(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

export function PublicTeacherAssignmentForm({
  token,
  workflow,
  teacherName,
  domainTitle,
}: Props) {
  const steps = useMemo(() => {
    return [...workflow.steps]
      .sort((a, b) => a.order - b.order)
      .map((step) => ({
        ...step,
        fields: [...step.fields].sort((a, b) => a.order - b.order),
      }));
  }, [workflow.steps]);

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [teacherSignatureDataUrl, setTeacherSignatureDataUrl] = useState("");
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function updateValue(key: string, value: unknown) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploading(true);
    setError("");

    try {
      const uploaded: EvidenceItem[] = [];

      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`/api/teacher/activity-assignment/${token}/upload`, {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "تعذر رفع الملف.");
        }

        uploaded.push(result.item);
      }

      setEvidenceItems((current) => [...current, ...uploaded]);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "تعذر رفع الشواهد."
      );
    } finally {
      setUploading(false);
    }
  }

  function validate() {
    for (const step of steps) {
      for (const field of step.fields) {
        if (isFileField(field)) {
          continue;
        }

        if (field.isRequired && isEmpty(values[field.key])) {
          return `الحقل مطلوب: ${field.label}`;
        }
      }
    }

    return "";
  }

  async function submit() {
    setError("");

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!teacherSignatureDataUrl) {
      setError("توقيع المعلم مطلوب قبل إرسال النشاط.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/teacher/activity-assignment/${token}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values,
          evidenceItems,
          teacherSignatureDataUrl,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "تعذر إرسال النشاط.");
      }

      setDone(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "تعذر إرسال النشاط."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <section className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <h2 className="mt-4 text-2xl font-black text-emerald-950">
          تم إرسال النشاط بنجاح
        </h2>

        <p className="mt-2 text-sm font-bold leading-7 text-emerald-800">
          شكرًا لك. تم إرسال البيانات والشواهد لرائد النشاط.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-black text-sky-700">نموذج المعلم</p>

        <h2 className="mt-2 text-2xl font-black leading-9 text-slate-950">
          {workflow.name || "تنفيذ نشاط مدرسي"}
        </h2>

        <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
          الأستاذ/ة {teacherName} — المجال: {domainTitle}
        </p>
      </section>

      {steps.map((step, index) => (
        <section
          key={step.id}
          className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-5">
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
              الخطوة {new Intl.NumberFormat("ar-SA").format(index + 1)}
            </span>

            <h3 className="mt-3 text-xl font-black text-slate-950">
              {step.title}
            </h3>

            {step.description ? (
              <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                {step.description}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4">
            {step.fields.map((field) => (
              <FieldRenderer
                key={field.id}
                field={field}
                value={values[field.key]}
                onChange={(value) => updateValue(field.key, value)}
                onUpload={uploadFiles}
                uploading={uploading}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-xl font-black text-slate-950">الشواهد</h3>
        <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
          ارفع صور تنفيذ النشاط أو أي ملفات داعمة. الأفضل رفع الصور مباشرة من الجوال.
        </p>

        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-sky-200 bg-sky-50 p-6 text-center text-sky-700">
          <UploadCloud className="h-8 w-8" />
          <span className="mt-2 text-sm font-black">
            {uploading ? "جاري الرفع..." : "اضغط لرفع الشواهد"}
          </span>
          <input
            type="file"
            multiple
            accept="image/*,.pdf"
            className="hidden"
            disabled={uploading}
            onChange={(event) => uploadFiles(event.target.files)}
          />
        </label>

        {evidenceItems.length > 0 ? (
          <div className="mt-4 grid gap-2">
            {evidenceItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600"
              >
                {item.fileName}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-xl font-black text-slate-950">توقيع المعلم</h3>
        <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
          وقّع داخل المربع بإصبعك من الجوال، وسيحفظ التوقيع باسمك عند إرسال النشاط.
        </p>

        <div className="mt-4">
          {teacherSignatureDataUrl ? (
            <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-sm font-black text-emerald-800">
                تم حفظ توقيع المعلم.
              </p>

              <img
                src={teacherSignatureDataUrl}
                alt="توقيع المعلم"
                className="mt-3 h-24 max-w-full rounded-2xl bg-white object-contain p-3 ring-1 ring-emerald-100"
              />

              <button
                type="button"
                onClick={() => setShowSignaturePad(true)}
                className="mt-3 rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-black text-emerald-800 transition hover:bg-emerald-50"
              >
                تعديل التوقيع
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSignaturePad(true)}
              className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-slate-800"
            >
              إضافة توقيع
            </button>
          )}
        </div>

        {showSignaturePad ? (
          <TeacherSignaturePadModal
            teacherName={teacherName}
            initialValue={teacherSignatureDataUrl}
            onClose={() => setShowSignaturePad(false)}
            onSave={(value) => {
              setTeacherSignatureDataUrl(value);
              setShowSignaturePad(false);
            }}
          />
        ) : null}
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
          {error}
        </div>
      ) : null}

      <section className="sticky bottom-3 z-20 rounded-[1.5rem] border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
        <button
          type="button"
          onClick={submit}
          disabled={submitting || uploading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-base font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          إرسال النشاط لرائد النشاط
        </button>
      </section>
    </section>
  );
}

function TeacherSignaturePadModal({
  teacherName,
  initialValue,
  onClose,
  onSave,
}: {
  teacherName: string;
  initialValue: string;
  onClose: () => void;
  onSave: (value: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasSignatureRef = useRef(Boolean(initialValue));
  const [draftSignature, setDraftSignature] = useState(initialValue);

  function resizeCanvas() {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const previous = draftSignature;

    canvas.width = Math.max(320, Math.floor(rect.width * ratio));
    canvas.height = Math.floor(190 * ratio);

    const context = canvas.getContext("2d");

    if (!context) return;

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, rect.width, 190);
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#0f172a";

    if (previous) {
      const image = new Image();
      image.onload = () => {
        context.drawImage(image, 0, 0, rect.width, 190);
      };
      image.src = previous;
    }
  }

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);

    const point = getPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    const point = getPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();

    hasSignatureRef.current = true;
  }

  function stopDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!canvas || !drawingRef.current) return;

    drawingRef.current = false;

    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }

    if (hasSignatureRef.current) {
      setDraftSignature(canvas.toDataURL("image/png"));
    }
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, rect.width, 190);

    hasSignatureRef.current = false;
    setDraftSignature("");
  }

  useEffect(() => {
    resizeCanvas();

    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center" dir="rtl">
      <section className="w-full max-w-2xl rounded-[2rem] bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-black text-slate-950">
              توقيع المعلم
            </h3>
            <p className="mt-2 text-sm font-bold text-slate-500">
              وقّع داخل المستطيل الأبيض بإصبعك ثم اضغط حفظ التوقيع.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            إغلاق
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-300 bg-white shadow-inner">
          <canvas
            ref={canvasRef}
            className="block h-[220px] w-full touch-none bg-white"
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
          />
        </div>

        <p className="mt-3 text-xs font-black text-slate-500">
          الاسم المعتمد للتوقيع: {teacherName}
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={clearSignature}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            مسح التوقيع
          </button>

          <button
            type="button"
            onClick={() => onSave(draftSignature)}
            disabled={!draftSignature}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            حفظ التوقيع
          </button>
        </div>
      </section>
    </div>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
  onUpload,
  uploading,
}: {
  field: RuntimeField;
  value: unknown;
  onChange: (value: unknown) => void;
  onUpload: (files: FileList | null) => void;
  uploading: boolean;
}) {
  if (isFileField(field)) {
    return (
      <label className="block">
        <FieldLabel field={field} />
        <input
          type="file"
          multiple
          disabled={uploading}
          onChange={(event) => onUpload(event.target.files)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold"
        />
        {field.helpText ? (
          <p className="mt-2 text-xs font-bold text-slate-400">{field.helpText}</p>
        ) : null}
      </label>
    );
  }

  if (field.type === "TEXTAREA" || field.type === "RICH_TEXT") {
    return (
      <label className="block">
        <FieldLabel field={field} />
        <textarea
          value={String(value || "")}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-50"
          placeholder={field.placeholder || undefined}
        />
      </label>
    );
  }

  if (field.type === "NUMBER" || field.type === "DATE" || field.type === "TEXT") {
    return (
      <label className="block">
        <FieldLabel field={field} />
        <input
          value={String(value || "")}
          onChange={(event) => onChange(event.target.value)}
          type={field.type === "NUMBER" ? "number" : field.type === "DATE" ? "date" : "text"}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-50"
          placeholder={field.placeholder || undefined}
        />
      </label>
    );
  }

  if (field.type === "SELECT" || field.type === "RADIO") {
    return (
      <label className="block">
        <FieldLabel field={field} />
        <select
          value={String(value || "")}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-50"
        >
          <option value="">اختر...</option>
          {field.options.map((option) => (
            <option key={option.id} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "MULTI_SELECT" || field.type === "CHECKBOX") {
    const selected = Array.isArray(value) ? value.map(String) : [];

    return (
      <div>
        <FieldLabel field={field} />
        <div className="grid gap-2">
          {field.options.map((option) => (
            <label
              key={option.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700"
            >
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...selected, option.value]
                    : selected.filter((item) => item !== option.value);

                  onChange(next);
                }}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>
    );
  }

  return (
    <label className="block">
      <FieldLabel field={field} />
      <input
        value={String(value || "")}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-50"
        placeholder={field.placeholder || undefined}
      />
    </label>
  );
}

function FieldLabel({ field }: { field: RuntimeField }) {
  return (
    <span className="mb-2 block text-sm font-black text-slate-700">
      {field.label}
      {field.isRequired ? <span className="text-red-500"> *</span> : null}
    </span>
  );
}