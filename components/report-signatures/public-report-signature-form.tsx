"use client";

import type { PointerEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type RequestStatus = "PENDING" | "SIGNED" | "EXPIRED" | "CANCELED";

export type PublicActivityTeamSupervisorOption = {
  name: string;
  fieldKeys: string[];
  signed: boolean;
};

export function PublicReportSignatureForm({
  token,
  reportPreview,
  requesterDisplayName,
  principalName,
  status,
  mode = "report",
  supervisorOptions = [],
}: {
  token: string;
  reportPreview: ReactNode;
  requesterDisplayName: string;
  principalName: string;
  status: RequestStatus;
  mode?: "report" | "activity-team";
  supervisorOptions?: PublicActivityTeamSupervisorOption[];
}) {
  const activityMode = mode === "activity-team";
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasSignatureRef = useRef(false);
  const [signature, setSignature] = useState("");
  const [consentToReuse, setConsentToReuse] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(status === "SIGNED");
  const [error, setError] = useState("");
  const [showSignature, setShowSignature] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState("");
  const [activityOptions, setActivityOptions] = useState(supervisorOptions);
  const [activitySuccess, setActivitySuccess] = useState("");

  useEffect(() => {
    if (status !== "PENDING" || !showSignature) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const prepare = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(320, Math.floor(rect.width * ratio));
      canvas.height = Math.floor(220 * ratio);
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.lineWidth = 3;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "#0f172a";
    };
    prepare();
    window.addEventListener("resize", prepare);
    return () => window.removeEventListener("resize", prepare);
  }, [showSignature, status]);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: PointerEvent<HTMLCanvasElement>) {
    if (saving) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    drawingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const current = point(event);
    context.beginPath();
    context.moveTo(current.x, current.y);
  }

  function draw(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || saving) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const current = point(event);
    context.lineTo(current.x, current.y);
    context.stroke();
    hasSignatureRef.current = true;
  }

  function stop(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {}
    if (hasSignatureRef.current) setSignature(event.currentTarget.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || saving) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    hasSignatureRef.current = false;
    setSignature("");
  }

  async function confirm() {
    if (!signature || saving) return;
    if (activityMode && !selectedSupervisor) {
      setError("اختر اسمك أولًا.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const endpoint = activityMode
        ? `/api/activity-team-signature/${encodeURIComponent(token)}`
        : `/api/report-signature/${encodeURIComponent(token)}`;
      const body = activityMode
        ? { dataUrl: signature, supervisorName: selectedSupervisor }
        : { dataUrl: signature, consentToReuse };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "تعذر حفظ التوقيع.");
      }
      if (activityMode) {
        setActivityOptions((current) => current.map((option) => option.name === selectedSupervisor ? { ...option, signed: true } : option));
        setActivitySuccess(`تم حفظ توقيع ${selectedSupervisor} بنجاح.`);
        clear();
        setShowSignature(false);
        router.refresh();
      } else {
        setSaved(true);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "تعذر حفظ التوقيع.");
    } finally {
      setSaving(false);
    }
  }

  if (saved && !activityMode) {
    return <StatusCard title="تم توقيع التقرير بنجاح" text="تم ربط توقيعك بهذا التقرير، ولا يمكن استخدام الرابط مرة أخرى." tone="green" />;
  }
  if (status === "EXPIRED") return <StatusCard title="انتهت صلاحية الرابط" text="اطلب من مرسل التقرير إنشاء رابط توقيع جديد." tone="red" />;
  if (status === "CANCELED") return <StatusCard title="تم إلغاء طلب التوقيع" text="هذا الرابط لم يعد صالحًا للاستخدام." tone="red" />;

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-6" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-[2rem] border border-blue-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-black text-blue-700">{activityMode ? "توقيع فريق النشاط الطلابي" : "طلب توقيع تقرير"}</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">{activityMode ? "فريق النشاط الطلابي بالمدرسة" : "مراجعة التقرير وتوقيعه"}</h1>
          <p className="mt-3 text-sm font-bold leading-7 text-slate-600">
            {activityMode ? "اختر اسمك من القائمة ثم أضف توقيعك الإلكتروني." : `فضلًا راجع التقرير التالي كاملًا قبل إضافة توقيع ${principalName || "مدير المدرسة"}.`}
          </p>
        </header>

        <div className="overflow-hidden rounded-[2rem] bg-slate-200 p-3">{reportPreview}</div>

        {activityMode ? (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-black text-slate-950">توقيع المشرف</h2>
            <label className="mt-4 block text-sm font-black text-slate-700">
              اختر اسمك
              <select value={selectedSupervisor} onChange={(event) => { setSelectedSupervisor(event.target.value); setActivitySuccess(""); setError(""); }} className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-bold outline-none focus:border-blue-500">
                <option value="">اختر اسم المشرف</option>
                {activityOptions.map((option) => <option key={option.name} value={option.name}>{option.name}{option.signed ? " — تم التوقيع" : ""}</option>)}
              </select>
            </label>
            {selectedSupervisor && activityOptions.find((option) => option.name === selectedSupervisor)?.signed ? (
              <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">تم توقيع هذا المشرف مسبقًا.</p>
            ) : !showSignature ? (
              <div className="mt-5 flex justify-center"><button type="button" onClick={() => setShowSignature(true)} disabled={!selectedSupervisor} className="rounded-2xl bg-blue-700 px-7 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">إضافة التوقيع</button></div>
            ) : null}
            {activitySuccess ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{activitySuccess}</p> : null}
          </section>
        ) : null}

        {(!activityMode && !showSignature) || (activityMode && showSignature && !activityOptions.find((option) => option.name === selectedSupervisor)?.signed) ? (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-black text-slate-950">{activityMode ? "إضافة توقيع المشرف" : "إضافة توقيع المدير"}</h2>
            <p className="mt-2 text-sm font-bold text-slate-500">وقّع داخل المساحة البيضاء ثم أكد التوقيع.</p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-inner">
              <canvas ref={canvasRef} className="block h-[220px] w-full touch-none" onPointerDown={start} onPointerMove={draw} onPointerUp={stop} onPointerCancel={stop} />
            </div>
            {!activityMode && signature ? (
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold leading-7 text-slate-700">
                <input type="checkbox" checked={consentToReuse} onChange={(event) => setConsentToReuse(event.target.checked)} className="mt-1 h-5 w-5" />
                <span>أوافق على حفظ توقيعي والسماح باستخدامه في التقارير المستقبلية لهذه المدرسة/المستخدم: {requesterDisplayName}.</span>
              </label>
            ) : null}
            {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={clear} disabled={saving} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 disabled:opacity-50">مسح التوقيع</button>
              <button type="button" onClick={() => void confirm()} disabled={!signature || saving} className="rounded-2xl bg-blue-700 px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? "جاري حفظ التوقيع..." : "تأكيد التوقيع"}</button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function StatusCard({ title, text, tone }: { title: string; text: string; tone: "green" | "red" }) {
  return <main className="grid min-h-screen place-items-center bg-slate-100 p-4" dir="rtl"><section className={`w-full max-w-xl rounded-[2rem] border bg-white p-8 text-center shadow-sm ${tone === "green" ? "border-emerald-200" : "border-red-200"}`}><h1 className={`text-2xl font-black ${tone === "green" ? "text-emerald-700" : "text-red-700"}`}>{title}</h1><p className="mt-3 text-sm font-bold leading-7 text-slate-600">{text}</p></section></main>;
}
