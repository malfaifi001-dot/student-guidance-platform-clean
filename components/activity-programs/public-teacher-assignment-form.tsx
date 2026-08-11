"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import {
  DynamicFormRenderer,
  type DynamicFormRendererSaveHandler,
  type EvidenceItem,
} from "@/components/workflow/dynamic-form-renderer";
import type { RuntimeWorkflow } from "@/engine/runtime/runtime-resolver";

type Props = {
  token: string;
  workflow: RuntimeWorkflow;
  serviceId: string;
  teacherName: string;
  domainTitle: string;
};

export function PublicTeacherAssignmentForm({
  token,
  workflow,
  serviceId,
  teacherName,
  domainTitle,
}: Props) {
  const [teacherSignatureDataUrl, setTeacherSignatureDataUrl] = useState("");
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [done, setDone] = useState(false);

  async function uploadEvidence(files: FileList): Promise<EvidenceItem[]> {
    const uploaded: EvidenceItem[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(
        `/api/teacher/activity-assignment/${token}/upload`,
        { method: "POST", body: formData },
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "تعذر رفع الملف.");
      }

      uploaded.push(result.item);
    }

    return uploaded;
  }

  const saveAssignment: DynamicFormRendererSaveHandler = async ({
    type,
    values,
    evidenceItems,
  }) => {
    if (type !== "submit") return;
    if (!teacherSignatureDataUrl) {
      throw new Error("توقيع المعلم مطلوب قبل إرسال النشاط.");
    }

    const response = await fetch(`/api/teacher/activity-assignment/${token}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values, evidenceItems, teacherSignatureDataUrl }),
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
          شكرًا لك. تم إرسال البيانات والشواهد لرائد النشاط.
        </p>
      </section>
    );
  }

  return (
    <section className="p-5 sm:p-7">
      <DynamicFormRenderer
        workflow={workflow}
        serviceId={serviceId}
        requiresStudent={false}
        initialValues={{ activity_domain: domainTitle }}
        onSave={saveAssignment}
        onEvidenceUpload={uploadEvidence}
        allowDraftSave={false}
        submitLabel="إرسال النشاط لرائد النشاط"
        embedded
        beforeSubmit={
          <section className="border-t border-slate-100 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-950">توقيع المعلم</h3>
                <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                  أضف توقيعك قبل إرسال النشاط.
                </p>
              </div>
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
        }
      />
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
