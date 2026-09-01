"use client";

import { useEffect, useState } from "react";
import * as QRCode from "qrcode";

export function EvidenceQrCode({ url, title }: { url: string; title?: string }) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    if (!url) return;
    const absoluteUrl = new URL(url, window.location.origin).toString();
    void QRCode.toDataURL(absoluteUrl, { width: 220, margin: 1 })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [url]);

  if (!dataUrl) return <span className="text-xs font-bold text-slate-500">رمز QR غير متاح</span>;
  return <img src={dataUrl} alt={title ? `رمز QR لـ ${title}` : "رمز QR للشاهد"} className="mx-auto h-44 w-44 max-w-full object-contain" />;
}
