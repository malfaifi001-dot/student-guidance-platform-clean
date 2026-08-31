"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import {
  DynamicFormRenderer,
  type DynamicFormRendererSaveHandler,
  type EvidenceItem,
} from "@/components/workflow/dynamic-form-renderer";
import type { RuntimeWorkflow } from "@/engine/runtime/runtime-resolver";

type Props = {
  token: string;
  domains: {
    slug: string;
    title: string;
  }[];
};

function createDraftId() {
  const random = (() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID().replace(/-/g, "");
    }
    return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
  })();

  return `draft_${random}`;
}

export function PublicTeacherActivityLinkForm({
  token,
  domains,
}: Props) {
  const draftId = useRef<string>(createDraftId());
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [domainInfo, setDomainInfo] = useState<{
    title: string;
    serviceId: string;
    workflow: RuntimeWorkflow;
  } | null>(null);
  const [domainLoading, setDomainLoading] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [teacherPhone, setTeacherPhone] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherSignatureDataUrl, setTeacherSignatureDataUrl] = useState("");
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function loadDomain(slug: string) {
    setDomainLoading(true);
    setError("");
    setDomainInfo(null);

    try {
      const response = await fetch(`/api/teacher/activity-link/${token}/domains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainSlug: slug }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "تعذر تحميل نموذج هذا المجال.");
      }

      setSelectedDomain(slug);
      setDomainInfo({
        title: result.domain.title,
        serviceId: result.serviceId,
        workflow: result.workflow,
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "تعذر تحميل نموذج هذا المجال.",
      );
    } finally {
      setDomainLoading(false);
    }
  }

  async function uploadEvidence(files: FileList): Promise<EvidenceItem[]> {
    const uploaded: EvidenceItem[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("draftId", draftId.current);

      const response = await fetch(`/api/teacher/activity-link/${token}/upload`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "تعذر رفع الملف.");
      }

      uploaded.push(result.item);
    }

    return uploaded;
  }

  const saveSubmission: DynamicFormRendererSaveHandler = async ({
    type,
    values,
    evidenceItems,
  }) => {
    if (type !== "submit") return;

    if (!domainInfo) {
      throw new Error("اختر مجال النشاط أولاً.");
    }

    if (!teacherSignatureDataUrl) {
      throw new Error("توقيع المعلم مطلوب قبل إرسال النشاط.");
    }

    const response = await fetch(`/api/teacher/activity-link/${token}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domainSlug: selectedDomain,
        draftId: draftId.current,
        teacherName,
        teacherPhone,
        teacherEmail,
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
    return {
      feedbackTitle: "تم إرسال النشاط",
      feedbackMessage: result.message,
    };
  };

  if (done) {
    return (
      <section className="m-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-center sm:m-7">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <h2 className="mt-4 text-2xl font-black text-emerald-950">
          تم إرسال النشاط بنجاح
        </h2>

        <p className="mt-2 text-sm font-bold leading-7 text-emerald-800">
          شكرًا لك. أرسل نشاطك لرائد النشاط بانتظار المراجعة والاعتماد.
        </p>
      </section>
    );
  }

  return (
    <section className="p-5 sm:p-7">
      <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
        <h3 className="text-base font-black text-slate-950">اختر مجال النشاط</h3>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {domains.map((domain) => {
            const isActive = selectedDomain === domain.slug;

            return (
              <button
                key={domain.slug}
                type="button"
                onClick={() => loadDomain(domain.slug)}
                disabled={domainLoading}
                className={[
                  "rounded-2xl border px-4 py-3 text-right text-sm font-black transition disabled:opacity-60",
                  isActive
                    ? "border-sky-300 bg-sky-50 text-sky-800 ring-4 ring-sky-100"
                    : "border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50",
                ].join(" ")}
              >
                {domain.title}
              </button>
            );
          })}
        </div>

        {domainLoading ? (
          <div className="mt-3 inline-flex items-center gap-2 text-sm font-black text-sky-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            جارٍ تحميل النموذج...
          </div>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
            {error}
          </p>
        ) : null}
      </div>

      {domainInfo ? (
        <div className="mt-6 grid gap-4">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
            <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
              المجال: {domainInfo.title}
            </span>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <FieldLabel>اسم المعلم</FieldLabel>
                <input
                  value={teacherName}
                  onChange={(event) => setTeacherName(event.target.value)}
                  placeholder="مثال: محمد علي"
                  className="input"
                />
              </div>
              <div>
                <FieldLabel>رقم جوال المعلم</FieldLabel>
                <input
                  value={teacherPhone}
                  onChange={(event) => setTeacherPhone(event.target.value)}
                  inputMode="tel"
                  placeholder="05xxxxxxxx"
                  className="input"
                />
              </div>
              <div className="md:col-span-2">
                <FieldLabel>البريد الإلكتروني (اختياري)</FieldLabel>
                <input
                  value={teacherEmail}
                  onChange={(event) => setTeacherEmail(event.target.value)}
                  type="email"
                  placeholder="teacher@example.com"
                  className="input"
                />
              </div>
            </div>
          </div>

          <DynamicFormRenderer
            workflow={domainInfo.workflow}
            serviceId={domainInfo.serviceId}
            requiresStudent={false}
            initialValues={{ activity_domain: domainInfo.title }}
            onSave={saveSubmission}
            onEvidenceUpload={uploadEvidence}
            allowDraftSave={false}
            submitLabel="إرسال النشاط لرائد النشاط"
            embedded
            beforeSubmit={
              <section className="border-t border-slate-100 pt-5">
                <div>
                  <h3 className="text-base font-black text-slate-950">توقيع المعلم</h3>
                  <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                    أضف توقيعك قبل إرسال النشاط.
                  </p>
                </div>

                <div className="mt-3">
                  {teacherSignatureDataUrl ? (
                    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                      <p className="text-xs font-black text-emerald-800">
                        تم حفظ توقيع المعلم.
                      </p>

                      <img
                        src={teacherSignatureDataUrl}
                        alt="توقيع المعلم"
                        className="h-14 w-28 rounded-xl bg-white object-contain p-2 ring-1 ring-emerald-100"
                      />

                      <button
                        type="button"
                        onClick={() => setShowSignaturePad(true)}
                        className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-800 transition hover:bg-emerald-50"
                      >
                        تعديل التوقيع
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowSignaturePad(true)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-800 transition hover:bg-slate-100"
                    >
                      إضافة توقيع
                    </button>
                  )}
                </div>

                {showSignaturePad ? (
                  <TeacherSignaturePadModal
                    teacherName={teacherName || "المعلم"}
                    initialValue={teacherSignatureDataUrl}
                    onClose={() => setShowSignaturePad(false)}
                    onSave={(value) => {
                      setTeacherSignatureDataUrl(value);
                      setShowSignaturePad(false);
                    }}
                  />
                ) : null}
              </section>
            }
          />
        </div>
      ) : null}

      <style jsx>{`
        .input { width: 100%; border-radius: 1rem; border: 1px solid rgb(226 232 240); background: white; color: rgb(51 65 85); padding: 0.75rem 1rem; font-size: 0.875rem; font-weight: 700; outline: none; transition: 150ms; }
        .input:focus { border-color: rgb(125 211 252); box-shadow: 0 0 0 4px rgb(240 249 255); }
      `}</style>
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-2 block text-xs font-black text-slate-600">{children}</span>
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
    context.clearRect(0, 0, rect.width, 190);
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

    context.clearRect(0, 0, rect.width, 190);

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
            <h3 className="text-2xl font-black text-slate-950">توقيع المعلم</h3>
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
