"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { SmartActionModal } from "@/components/ui/smart-action-modal";

export function ServiceOutputLinkActions({ link, onDeleted }: { link: { id: string }; onDeleted: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      const response = await fetch(`/api/dashboard/performance-links/${encodeURIComponent(link.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      onDeleted();
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button type="button" title="حذف الربط" aria-label="حذف الربط" onClick={() => setConfirmOpen(true)} disabled={busy} className="grid h-11 w-11 place-items-center rounded-2xl border border-rose-200 bg-white/10 text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
    <SmartActionModal open={confirmOpen} title="تأكيد حذف الربط" description="سيُحذف ارتباط ملف الإنجاز فقط، ولن تُحذف بيانات الخدمة الأصلية." variant="danger" confirmLabel="حذف الربط" cancelLabel="إلغاء" loading={busy} onConfirm={() => void remove()} onClose={() => !busy && setConfirmOpen(false)} />
  </>;
}
