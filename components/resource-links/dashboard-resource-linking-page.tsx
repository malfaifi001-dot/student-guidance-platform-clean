"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  Link2,
  Save,
  Search,
} from "lucide-react";

type SourceOption = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  openUrl: string;
  linkedTargetIds: string[];
};

type TargetOption = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  openUrl: string;
};

type ExistingLink = {
  sourceId: string;
  targetId: string;
  sourceTitle: string;
  sourceSubtitle: string;
  sourceStatus: string;
  sourceOpenUrl: string;
  targetTitle: string;
  targetSubtitle: string;
  targetStatus: string;
  targetOpenUrl: string;
};

type Props = {
  sourceType: string;
  targetType: string;
  title: string;
  subtitle: string;
  sourceLabel: string;
  targetLabel: string;
  targetSingularLabel?: string;
  sourceSearchPlaceholder: string;
  targetSearchPlaceholder: string;
  activeSourceLabel: string;
  selectedTargetsLabel: string;
  targetCardBadge?: string;
  openTargetLabel?: string;
  savedLinksTitle?: string;
  savedLinksSubtitle?: string;
  backHref: string;
  backLabel: string;
};

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "غير محدد";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("ar-SA-u-ca-gregory", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusLabel(status: string) {
  if (status === "DRAFT") return "مسودة";
  if (status === "SUBMITTED") return "مرسلة";
  if (status === "APPROVED") return "معتمدة";
  if (status === "COMPLETED") return "مكتمل";
  if (status === "PUBLISHED") return "منشور";
  if (status === "CLOSED") return "مغلق";
  if (status === "ARCHIVED") return "مؤرشف";

  return status || "جاهز";
}

export function DashboardResourceLinkingPage({
  sourceType,
  targetType,
  title,
  sourceLabel,
  targetLabel,
  targetSingularLabel = "عنصر",
  sourceSearchPlaceholder,
  targetSearchPlaceholder,
  activeSourceLabel,
  selectedTargetsLabel,
  targetCardBadge = "عنصر مرتبط",
  openTargetLabel = "فتح العنصر",
  savedLinksTitle = "الروابط المحفوظة",
  savedLinksSubtitle = "يعرض العلاقات المحفوظة بين التقارير والعناصر المختارة.",
  backHref,
  backLabel,
}: Props) {
  const [sources, setSources] = useState<SourceOption[]>([]);
  const [targets, setTargets] = useState<TargetOption[]>([]);
  const [existingLinks, setExistingLinks] = useState<ExistingLink[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [sourceQuery, setSourceQuery] = useState("");
  const [targetQuery, setTargetQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const selectedSource = useMemo(() => {
    return sources.find((source) => source.id === selectedSourceId) || null;
  }, [sources, selectedSourceId]);

  const selectedTargets = useMemo(() => {
    const ids = new Set(selectedTargetIds);
    return targets.filter((target) => ids.has(target.id));
  }, [targets, selectedTargetIds]);

  async function refreshExistingLinks() {
    const search = new URLSearchParams();
    search.set("sourceType", sourceType);
    search.set("targetType", targetType);

    const response = await fetch(`/api/dashboard/resource-links?${search.toString()}`, {
      cache: "no-store",
    });

    const data = await response.json();

    if (response.ok) {
      setExistingLinks(Array.isArray(data.existingLinks) ? data.existingLinks : []);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadOptions() {
      setLoading(true);
      setError("");

      try {
        const search = new URLSearchParams();
        search.set("sourceType", sourceType);
        search.set("targetType", targetType);

        if (sourceQuery.trim()) search.set("sourceQuery", sourceQuery.trim());
        if (targetQuery.trim()) search.set("targetQuery", targetQuery.trim());

        const response = await fetch(`/api/dashboard/resource-links?${search.toString()}`, {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "تعذر تحميل خيارات الربط.");
        }

        if (!ignore) {
          const nextSources = Array.isArray(data.sources) ? data.sources : [];
          const nextTargets = Array.isArray(data.targets) ? data.targets : [];
          const nextExistingLinks = Array.isArray(data.existingLinks) ? data.existingLinks : [];

          setSources(nextSources);
          setTargets(nextTargets);
          setExistingLinks(nextExistingLinks);

          if (!selectedSourceId && nextSources.length) {
            setSelectedSourceId(nextSources[0].id);
            setSelectedTargetIds(nextSources[0].linkedTargetIds || []);
          } else if (selectedSourceId) {
            const stillSelected = nextSources.find((source: SourceOption) => source.id === selectedSourceId);

            if (stillSelected) {
              setSelectedTargetIds((current) => {
                if (current.length) return current;
                return stillSelected.linkedTargetIds || [];
              });
            }
          }
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "تعذر تحميل خيارات الربط.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    const timer = window.setTimeout(loadOptions, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [sourceType, targetType, sourceQuery, targetQuery]);

  function selectSource(source: SourceOption) {
    setSelectedSourceId(source.id);
    setSelectedTargetIds(source.linkedTargetIds || []);
    setNotice("");
    setError("");
  }

  function toggleTarget(targetId: string) {
    setSelectedTargetIds((current) => {
      if (current.includes(targetId)) {
        return current.filter((id) => id !== targetId);
      }

      return [...current, targetId];
    });

    setNotice("");
  }

  async function saveLinks() {
    if (!selectedSourceId) {
      setError("اختر التقرير أولًا.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/dashboard/resource-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceType,
          sourceId: selectedSourceId,
          targetType,
          targetIds: selectedTargetIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر حفظ الربط.");
      }

      setSources((current) =>
        current.map((source) =>
          source.id === selectedSourceId
            ? { ...source, linkedTargetIds: data.targetIds || [] }
            : source,
        ),
      );

      setSelectedTargetIds(data.targetIds || []);
      setNotice(`تم ربط ${data.linkedCount || 0} ${targetSingularLabel} بالتقرير بنجاح.`);

      await refreshExistingLinks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ الربط.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-7" dir="rtl">
      <section className="overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-sky-800 via-cyan-700 to-sky-500 p-8 text-white shadow-xl">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <h1 className="text-4xl font-black">{title}</h1>
          </div>

          <Link
            href={backHref}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-sky-800 transition hover:bg-sky-50"
          >
            <ArrowRight className="h-4 w-4" />
            {backLabel}
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Metric icon={<FileText className="h-5 w-5" />} label={sourceLabel} value={String(sources.length)} />
        <Metric icon={<BarChart3 className="h-5 w-5" />} label={targetLabel} value={String(targets.length)} />
        <Metric icon={<Link2 className="h-5 w-5" />} label="المحددة للربط" value={String(selectedTargetIds.length)} />
      </section>

      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-sky-700">جدول الربط السابق</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{savedLinksTitle}</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
              {savedLinksSubtitle}
            </p>
          </div>

          <span className="rounded-full bg-sky-50 px-4 py-2 text-sm font-black text-sky-700 ring-1 ring-sky-100">
            {existingLinks.length} رابط
          </span>
        </div>

        {existingLinks.length ? (
          <div className="overflow-hidden rounded-[2rem] border border-slate-200">
            <table className="w-full border-collapse text-right text-sm">
              <thead className="bg-slate-50 text-xs font-black text-slate-500">
                <tr>
                  <th className="px-4 py-3">التقرير</th>
                  <th className="px-4 py-3">العنصر المرتبط</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3 text-left">إجراءات</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {existingLinks.map((link) => (
                  <tr key={`${link.sourceId}-${link.targetId}`} className="bg-white align-top">
                    <td className="px-4 py-4">
                      <p className="font-black leading-7 text-slate-950">{link.sourceTitle}</p>
                      <p className="mt-1 text-xs font-bold leading-6 text-slate-500">{link.sourceSubtitle}</p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-black leading-7 text-slate-950">{link.targetTitle}</p>
                      <p className="mt-1 text-xs font-bold leading-6 text-slate-500">{link.targetSubtitle}</p>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                          {getStatusLabel(link.sourceStatus)}
                        </span>

                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                          {getStatusLabel(link.targetStatus)}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={link.sourceOpenUrl}
                          target="_blank"
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                        >
                          فتح التقرير
                        </Link>

                        <Link
                          href={link.targetOpenUrl}
                          target="_blank"
                          className="rounded-2xl bg-sky-700 px-4 py-2 text-xs font-black text-white transition hover:bg-sky-800"
                        >
                          {openTargetLabel}
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState text="لا توجد روابط محفوظة حتى الآن." />
        )}
      </section>

      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <p className="text-xs font-black text-sky-700">{activeSourceLabel}</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              {selectedSource ? selectedSource.title : "اختر تقريرًا"}
            </h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
              {selectedSource ? selectedSource.subtitle : `حدد تقريرًا من القائمة اليمنى ثم اختر ${targetSingularLabel} أو أكثر.`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedSource ? (
              <Link
                href={selectedSource.openUrl}
                target="_blank"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                فتح التقرير
              </Link>
            ) : null}

            <button
              type="button"
              onClick={saveLinks}
              disabled={saving || !selectedSourceId}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "جاري الحفظ..." : "حفظ الربط"}
            </button>
          </div>
        </div>

        {notice ? (
          <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-black text-emerald-700 ring-1 ring-emerald-100">
            {notice}
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-black text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-black text-sky-700">{sourceLabel}</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">اختر التقرير</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
              اختر التقرير أو الحالة التي تريد ربط العناصر بها.
            </p>
          </div>

          <div className="relative mb-5">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={sourceQuery}
              onChange={(event) => setSourceQuery(event.target.value)}
              placeholder={sourceSearchPlaceholder}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-11 pl-4 text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-200 focus:bg-white"
            />
          </div>

          <div className="max-h-[680px] space-y-3 overflow-auto pr-1">
            {loading ? (
              <EmptyState text="جاري تحميل التقارير..." />
            ) : sources.length ? (
              sources.map((source) => {
                const selected = source.id === selectedSourceId;

                return (
                  <button
                    key={source.id}
                    type="button"
                    onClick={() => selectSource(source)}
                    className={[
                      "w-full rounded-[2rem] border p-5 text-right transition",
                      selected
                        ? "border-sky-300 bg-sky-50"
                        : "border-slate-200 bg-slate-50 hover:border-sky-200 hover:bg-white",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-black leading-7 text-slate-950">
                          {source.title}
                        </h3>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {source.subtitle}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-400">
                          آخر تحديث: {formatDate(source.updatedAt)}
                        </p>
                      </div>

                      <div className="shrink-0 space-y-2 text-left">
                        <span className="block rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                          {getStatusLabel(source.status)}
                        </span>

                        {source.linkedTargetIds?.length ? (
                          <span className="block rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                            {source.linkedTargetIds.length} {targetSingularLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <EmptyState text="لا توجد تقارير مطابقة." />
            )}
          </div>
        </section>

        <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-black text-sky-700">{targetLabel}</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">اختر {targetSingularLabel} أو أكثر</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
              يمكن ربط أكثر من عنصر بنفس التقرير، ويتم حفظ العلاقة في جدول عام قابل لإعادة الاستخدام.
            </p>
          </div>

          <div className="relative mb-5">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={targetQuery}
              onChange={(event) => setTargetQuery(event.target.value)}
              placeholder={targetSearchPlaceholder}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-11 pl-4 text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-200 focus:bg-white"
            />
          </div>

          {selectedTargets.length ? (
            <div className="mb-5 rounded-[2rem] bg-emerald-50 p-4 ring-1 ring-emerald-100">
              <p className="text-xs font-black text-emerald-700">{selectedTargetsLabel}</p>
              <p className="mt-2 text-sm font-bold leading-7 text-emerald-900">
                {selectedTargets.map((item) => item.title).join("، ")}
              </p>
            </div>
          ) : null}

          <div className="max-h-[680px] space-y-3 overflow-auto pr-1">
            {loading ? (
              <EmptyState text="جاري تحميل العناصر..." />
            ) : targets.length ? (
              targets.map((target) => {
                const selected = selectedTargetIds.includes(target.id);

                return (
                  <button
                    key={target.id}
                    type="button"
                    onClick={() => toggleTarget(target.id)}
                    className={[
                      "w-full rounded-[2rem] border p-5 text-right transition",
                      selected
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 bg-slate-50 hover:border-sky-200 hover:bg-white",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
                            {getStatusLabel(target.status)}
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                            {targetCardBadge}
                          </span>
                        </div>

                        <h3 className="mt-3 text-lg font-black leading-7 text-slate-950">
                          {target.title}
                        </h3>

                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {target.subtitle}
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-400">
                          آخر تحديث: {formatDate(target.updatedAt)}
                        </p>
                      </div>

                      <span
                        className={[
                          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl",
                          selected
                            ? "bg-emerald-700 text-white"
                            : "bg-white text-slate-300 ring-1 ring-slate-200",
                        ].join(" ")}
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <EmptyState text="لا توجد عناصر مطابقة." />
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
          {icon}
        </div>
        <div>
          <p className="text-xs font-black text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
      <p className="text-sm font-black text-slate-500">{text}</p>
    </div>
  );
}