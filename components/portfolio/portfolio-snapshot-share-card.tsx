"use client";

import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { Check, Copy, Download, MessageCircle, QrCode, Share2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import * as QRCode from "qrcode";

import { openExternalUrl } from "@/lib/native/external-url-handler";
import { buildPortfolioSnapshotWhatsAppUrl } from "@/lib/portfolio/portfolio-snapshot-share-contract";

export type PortfolioSnapshotShareData = {
  shareId: string;
  url: string;
  title: string;
  teacherName: string;
  jobTitle: string;
  schoolName: string;
  academicYear: string;
  term: string;
};

export function PortfolioSnapshotShareCard({ share, onClose }: { share: PortfolioSnapshotShareData; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState<"link" | "qr" | null>(null);
  const [busy, setBusy] = useState(false);
  const whatsappUrl = useMemo(() => buildPortfolioSnapshotWhatsAppUrl(share.teacherName, share.url), [share.teacherName, share.url]);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(share.url, { width: 320, margin: 2, errorCorrectionLevel: "M" })
      .then((value) => { if (!cancelled) setQrDataUrl(value); })
      .catch(() => { if (!cancelled) setQrDataUrl(""); });
    return () => { cancelled = true; };
  }, [share.url]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied("link");
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      const input = document.createElement("textarea");
      input.value = share.url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
  }

  async function shareApps() {
    setBusy(true);
    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({ title: share.title || "ملف الإنجاز المهني", text: `ملف الإنجاز المهني للمعلم/ة ${share.teacherName}`, url: share.url, dialogTitle: "مشاركة ملف الإنجاز" });
      } else if (typeof navigator.share === "function") {
        await navigator.share({ title: share.title || "ملف الإنجاز المهني", text: `ملف الإنجاز المهني للمعلم/ة ${share.teacherName}`, url: share.url });
      } else {
        await copyLink();
      }
    } finally {
      setBusy(false);
    }
  }

  async function copyQr() {
    if (!qrDataUrl || typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
      downloadQr();
      return;
    }
    const blob = await (await fetch(qrDataUrl)).blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type || "image/png"]: blob })]);
    setCopied("qr");
    window.setTimeout(() => setCopied(null), 1800);
  }

  function downloadQr() {
    if (!qrDataUrl) return;
    const anchor = document.createElement("a");
    anchor.href = qrDataUrl;
    anchor.download = "teachix-portfolio-qr.png";
    anchor.click();
  }

  const LinkActionIcon = copied === "link" ? Check : Copy;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm print:hidden" dir="rtl">
      <section role="dialog" aria-modal="true" aria-labelledby="portfolio-share-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-8">
          <div><p className="text-sm font-black text-sky-700">Teachix</p><h2 id="portfolio-share-title" className="mt-1 text-xl font-black text-slate-950">مشاركة ملف الإنجاز المهني</h2></div>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </header>
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_220px]">
          <div>
            <div className="rounded-3xl bg-gradient-to-br from-sky-50 to-indigo-50 p-5">
              <p className="text-lg font-black text-slate-950">{share.teacherName}</p>
              <p className="mt-1 font-bold text-sky-800">{share.jobTitle}</p>
              <p className="mt-3 text-sm font-bold text-slate-700">{share.schoolName}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-600"><span>العام: {share.academicYear || "غير محدد"}</span><span>الفصل: {share.term || "غير محدد"}</span></div>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left text-xs font-bold text-slate-600" dir="ltr">{share.url}</div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => void copyLink()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white"><LinkActionIcon className="h-4 w-4" />{copied === "link" ? "تم نسخ الرابط" : "نسخ الرابط"}</button>
              <button type="button" onClick={() => void openExternalUrl(whatsappUrl)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700"><MessageCircle className="h-4 w-4" />مشاركة عبر واتساب</button>
              <button type="button" onClick={() => void shareApps()} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-black text-sky-800 disabled:opacity-60"><Share2 className="h-4 w-4" />مشاركة عبر التطبيقات</button>
            </div>
          </div>
          <div className="text-center">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">{qrDataUrl ? <img src={qrDataUrl} alt="رمز QR لملف الإنجاز" className="mx-auto aspect-square w-full rounded-2xl" /> : <div className="flex aspect-square items-center justify-center text-slate-400"><QrCode className="h-8 w-8" /></div>}</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => void copyQr()} disabled={!qrDataUrl} className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-2 py-2 text-xs font-black text-slate-700 disabled:opacity-50"><Copy className="h-3.5 w-3.5" />{copied === "qr" ? "تم النسخ" : "نسخ QR"}</button>
              <button type="button" onClick={downloadQr} disabled={!qrDataUrl} className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-2 py-2 text-xs font-black text-slate-700 disabled:opacity-50"><Download className="h-3.5 w-3.5" />تنزيل QR</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
