"use client";

import type { PointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type SignaturePageData = {
  schoolName: string;
  principalName: string;
  signed: boolean;
  signedAt: string;
};

type LoadState = "loading" | "ready" | "error" | "saved";

function formatDate(value: string) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function PrincipalSignaturePublicForm({ token }: { token: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasSignatureRef = useRef(false);

  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<SignaturePageData | null>(null);
  const [error, setError] = useState("");
  const [draftSignature, setDraftSignature] = useState("");
  const [saving, setSaving] = useState(false);

  const apiUrl = useMemo(() => {
    return `/api/school-signature/${encodeURIComponent(token)}`;
  }, [token]);

  async function loadSignatureRequest() {
    try {
      setState("loading");
      setError("");

      const response = await fetch(apiUrl, {
        cache: "no-store",
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "رابط التوقيع غير صالح.");
      }

      setData(payload.data);
      setState("ready");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "تعذر فتح رابط التوقيع.",
      );
      setState("error");
    }
  }

  function prepareCanvas() {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;

    canvas.width = Math.max(320, Math.floor(rect.width * ratio));
    canvas.height = Math.floor(230 * ratio);

    const context = canvas.getContext("2d");

    if (!context) return;

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, rect.width, 230);
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#0f172a";
  }

  function getPoint(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function startDrawing(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context || saving) return;

    drawingRef.current = true;

    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // تجاهل
    }

    const point = getPoint(event);

    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function draw(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || saving) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    const point = getPoint(event);

    context.lineTo(point.x, point.y);
    context.stroke();

    hasSignatureRef.current = true;
  }

  function stopDrawing(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!canvas || !drawingRef.current) return;

    drawingRef.current = false;

    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // تجاهل
    }

    if (hasSignatureRef.current) {
      setDraftSignature(canvas.toDataURL("image/png"));
    }
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context || saving) return;

    const rect = canvas.getBoundingClientRect();

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, rect.width, 230);

    hasSignatureRef.current = false;
    setDraftSignature("");
  }

  async function saveSignature() {
    if (!draftSignature || saving) return;

    try {
      setSaving(true);
      setError("");

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dataUrl: draftSignature,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "تعذر حفظ التوقيع.");
      }

      setData((current) =>
        current
          ? {
              ...current,
              signed: true,
              signedAt: payload.signedAt || new Date().toISOString(),
            }
          : current,
      );

      setState("saved");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "تعذر حفظ التوقيع.",
      );
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadSignatureRequest();
  }, [apiUrl]);

  useEffect(() => {
    if (state !== "ready") return;

    prepareCanvas();

    window.addEventListener("resize", prepareCanvas);

    return () => {
      window.removeEventListener("resize", prepareCanvas);
    };
  }, [state]);

  return (
    <main
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 px-4 py-6 text-slate-950"
      dir="rtl"
    >
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl items-center justify-center">
        <div className="w-full rounded-[2.5rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-blue-100/60 sm:p-8">
          <div className="text-center">
            <p className="text-sm font-black text-blue-700">
              منصة التوجيه الطلابي
            </p>
            <h1 className="mt-3 text-3xl font-black text-slate-950">
              توقيع مدير المدرسة
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              هذه الصفحة مخصصة لاعتماد توقيع مدير المدرسة للاستخدام في التقارير الرسمية.
            </p>
          </div>

          {state === "loading" ? (
            <div className="mt-8 rounded-[2rem] border border-slate-200 bg-slate-50 p-8 text-center">
              <p className="text-sm font-black text-slate-600">
                جاري فتح رابط التوقيع...
              </p>
            </div>
          ) : null}

          {state === "error" ? (
            <div className="mt-8 rounded-[2rem] border border-red-100 bg-red-50 p-6 text-center">
              <p className="text-lg font-black text-red-700">
                تعذر فتح الرابط
              </p>
              <p className="mt-2 text-sm font-bold leading-7 text-red-600">
                {error || "رابط التوقيع غير صالح أو منتهي."}
              </p>
            </div>
          ) : null}

          {state === "saved" ? (
            <div className="mt-8 rounded-[2rem] border border-emerald-100 bg-emerald-50 p-6 text-center">
              <p className="text-2xl font-black text-emerald-700">
                تم حفظ توقيع المدير بنجاح
              </p>
              <p className="mt-2 text-sm font-bold leading-7 text-emerald-700">
                يمكن الآن إغلاق هذه الصفحة. سيظهر التوقيع تلقائيًا في التقارير بعد تحديث الحالة.
              </p>

              {data?.signedAt ? (
                <p className="mt-4 text-xs font-black text-emerald-600">
                  وقت الحفظ: {formatDate(data.signedAt)}
                </p>
              ) : null}
            </div>
          ) : null}

          {state === "ready" && data ? (
            <div className="mt-8 space-y-5">
              <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-black text-slate-500">
                      المدرسة
                    </p>
                    <p className="mt-1 text-base font-black text-slate-950">
                      {data.schoolName || "اسم المدرسة"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-black text-slate-500">
                      مدير المدرسة
                    </p>
                    <p className="mt-1 text-base font-black text-slate-950">
                      {data.principalName || "مدير المدرسة"}
                    </p>
                  </div>
                </div>

                {data.signed ? (
                  <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-700">
                    يوجد توقيع محفوظ سابقًا. عند الحفظ الآن سيتم تحديث توقيع المدير.
                    {data.signedAt ? ` آخر توقيع: ${formatDate(data.signedAt)}` : ""}
                  </div>
                ) : null}
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-4">
                <p className="text-sm font-black text-slate-700">
                  وقّع داخل المساحة البيضاء
                </p>

                <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-slate-300 bg-white shadow-inner">
                  <canvas
                    ref={canvasRef}
                    className="block h-[230px] w-full touch-none bg-white"
                    onPointerDown={startDrawing}
                    onPointerMove={draw}
                    onPointerUp={stopDrawing}
                    onPointerCancel={stopDrawing}
                  />
                </div>

                {error ? (
                  <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {error}
                  </p>
                ) : null}

                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={clearSignature}
                    disabled={saving}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    مسح التوقيع
                  </button>

                  <button
                    type="button"
                    onClick={saveSignature}
                    disabled={!draftSignature || saving}
                    className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "جاري حفظ التوقيع..." : "حفظ توقيع المدير"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}