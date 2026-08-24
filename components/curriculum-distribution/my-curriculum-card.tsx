"use client";

import { Eye, Link2, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { ExpandableActionMenu } from "@/components/actions/expandable-action-menu";
import { PerformanceItemLinkPopCard } from "@/components/performance-links/performance-item-link-pop-card";
import { SmartActionModal } from "@/components/ui/smart-action-modal";

const COPY = {
  linked: "\u0645\u0631\u062a\u0628\u0637 \u0628\u0645\u0644\u0641 \u0627\u0644\u0625\u0646\u062c\u0627\u0632",
  preview: "\u0645\u0639\u0627\u064a\u0646\u0629",
  editLink: "\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0631\u0628\u0637",
  link: "\u0631\u0628\u0637 \u0628\u0645\u0644\u0641 \u0627\u0644\u0625\u0646\u062c\u0627\u0632",
  send: "\u0625\u0631\u0633\u0627\u0644",
  remove: "\u062d\u0630\u0641 \u0645\u0646 \u0645\u0646\u0647\u062c\u064a",
  removeTitle: "\u062d\u0630\u0641 \u0645\u0646 \u0645\u0646\u0647\u062c\u064a\u061f",
  removeDescription: "\u0633\u064a\u062a\u0645 \u062d\u0630\u0641 \u0645\u0631\u062c\u0639 \u0627\u0644\u0645\u0627\u062f\u0629 \u0645\u0646 \u0642\u0627\u0626\u0645\u0629 \u0645\u0646\u0647\u062c\u064a \u0641\u0642\u0637\u060c \u0648\u0644\u0646 \u062a\u062a\u0623\u062b\u0631 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062a\u0648\u0632\u064a\u0639 \u0623\u0648 \u0631\u0648\u0627\u0628\u0637 \u0645\u0644\u0641 \u0627\u0644\u0625\u0646\u062c\u0627\u0632.",
  confirm: "\u062d\u0630\u0641 \u0645\u0646 \u0645\u0646\u0647\u062c\u064a",
  cancel: "\u0625\u0644\u063a\u0627\u0621",
};

export type SavedCurriculumItem = {
  id: string;
  subjectId: string;
  semesterId: string;
  createdAt: string;
  subject: { id: string; name: string };
  stage: { id: string; name: string };
  grade: { id: string; name: string };
  semester: { id: string; name: string };
  portfolioLink?: { id: string; performanceItemKey: string; targetSectionKey?: string | null } | null;
};

export function MyCurriculumCard({ item, onRefresh, onSend, onPreview }: { item: SavedCurriculumItem; onRefresh: () => void; onSend: (item: SavedCurriculumItem) => void; onPreview: (item: SavedCurriculumItem) => void }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  async function remove() {
    setBusy(true);
    try {
      const response = await fetch("/api/dashboard/curriculum-distribution/my-curriculum", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }) });
      if (!response.ok) throw new Error();
      setDeleteOpen(false);
      onRefresh();
    } finally { setBusy(false); }
  }

  return <>
    <article className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-black text-slate-950" title={item.subject.name}>{item.subject.name}</h3>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold text-slate-500"><span className="rounded-full bg-slate-50 px-2.5 py-1">{item.stage.name}</span><span className="rounded-full bg-slate-50 px-2.5 py-1">{item.grade.name}</span><span className="rounded-full bg-slate-50 px-2.5 py-1">{item.semester.name}</span></div>
          {item.portfolioLink ? <p className="mt-2 text-xs font-black text-sky-700">{COPY.linked}</p> : null}
        </div>
        <ExpandableActionMenu menuId={`my-curriculum-${item.id}`} overlayStrip>
          <button type="button" onClick={() => onPreview(item)} aria-label={COPY.preview} title={COPY.preview} className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"><Eye className="h-4 w-4" /></button>
          <button type="button" onClick={() => setLinkOpen(true)} aria-label={item.portfolioLink ? COPY.editLink : COPY.link} title={item.portfolioLink ? COPY.editLink : COPY.link} className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"><Link2 className="h-4 w-4" /></button>
          <button type="button" onClick={() => onSend(item)} aria-label={COPY.send} title={COPY.send} className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"><Send className="h-4 w-4" /></button>
          <button type="button" onClick={() => setDeleteOpen(true)} aria-label={COPY.remove} title={COPY.remove} className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"><Trash2 className="h-4 w-4" /></button>
        </ExpandableActionMenu>
      </div>
    </article>
    <PerformanceItemLinkPopCard open={linkOpen} serviceSlug="curriculum-distribution" roleContext="TEACHER" resourceType="CURRICULUM_DISTRIBUTION" sourceReference={{ subjectId: item.subjectId, semesterId: item.semesterId }} displayTitle={`\u062e\u0637\u0629 \u062a\u0648\u0632\u064a\u0639 \u0627\u0644\u0645\u0646\u0647\u062c \u0644\u0645\u0627\u062f\u0629 ${item.subject.name}`} existingLink={item.portfolioLink} onClose={() => setLinkOpen(false)} onSaved={() => { setLinkOpen(false); onRefresh(); }} />
    <SmartActionModal open={deleteOpen} title={COPY.removeTitle} description={COPY.removeDescription} variant="danger" confirmLabel={COPY.confirm} cancelLabel={COPY.cancel} loading={busy} onConfirm={() => void remove()} onClose={() => !busy && setDeleteOpen(false)} />
  </>;
}
