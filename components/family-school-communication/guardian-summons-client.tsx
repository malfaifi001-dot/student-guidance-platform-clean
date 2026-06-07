"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GuardianSummonsReportEnginePdfButton } from "@/components/document-export/guardian-summons-report-engine-pdf-button";
import {
  GUARDIAN_SUMMONS_STORAGE_KEY,
  guardianSummonsAttendanceLabels,
  guardianSummonsStatusLabels,
  type GuardianSummonsAttendanceStatus,
  type GuardianSummonsRecord,
} from "@/components/family-school-communication/guardian-summons-types";

const attendanceOptions: GuardianSummonsAttendanceStatus[] = [
  "PENDING",
  "ATTENDED",
  "ABSENT",
  "RESCHEDULED",
  "PHONE_CONTACT",
  "CLOSED",
];

export function GuardianSummonsClient() {
  const [records, setRecords] = useState<GuardianSummonsRecord[]>([]);
  const [query, setQuery] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState<
    GuardianSummonsAttendanceStatus | "ALL"
  >("ALL");

  useEffect(() => {
    loadRecords();

    function handleStorage() {
      loadRecords();
    }

    function handleFocus() {
      loadRecords();
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const searchText = [
        record.student?.fullName,
        record.student?.nationalId,
        record.guardianName,
        record.guardianPhone,
        record.summonReason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = query.trim()
        ? searchText.includes(query.trim().toLowerCase())
        : true;

      const matchesAttendance =
        attendanceFilter === "ALL"
          ? true
          : record.attendanceStatus === attendanceFilter;

      return matchesQuery && matchesAttendance;
    });
  }, [records, query, attendanceFilter]);

  function loadRecords() {
    const raw = window.localStorage.getItem(GUARDIAN_SUMMONS_STORAGE_KEY);

    if (!raw) {
      setRecords([]);
      return;
    }

    try {
      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        setRecords([]);
        return;
      }

      const normalized = parsed.map(normalizeRecord).filter(Boolean);

      setRecords(normalized as GuardianSummonsRecord[]);
    } catch {
      setRecords([]);
    }
  }

  function persistRecords(nextRecords: GuardianSummonsRecord[]) {
    setRecords(nextRecords);

    window.localStorage.setItem(
      GUARDIAN_SUMMONS_STORAGE_KEY,
      JSON.stringify(nextRecords)
    );
  }

  function updateAttendanceStatus(
    recordId: string,
    attendanceStatus: GuardianSummonsAttendanceStatus
  ) {
    const nextRecords = records.map((record) =>
      record.id === recordId
        ? {
            ...record,
            attendanceStatus,
          }
        : record
    );

    persistRecords(nextRecords);
  }

  function updatePostNotes(recordId: string, postNotes: string) {
    const nextRecords = records.map((record) =>
      record.id === recordId
        ? {
            ...record,
            postNotes,
          }
        : record
    );

    persistRecords(nextRecords);
  }

  function markDownloaded(recordId: string) {
    const nextRecords = records.map((record) =>
      record.id === recordId
        ? {
            ...record,
            status: "PRINTED" as const,
            printedAt: new Date().toISOString(),
          }
        : record
    );

    persistRecords(nextRecords);
  }

  function deleteRecord(recordId: string) {
    const confirmed = window.confirm("هل تريد حذف هذا الاستدعاء؟");

    if (!confirmed) return;

    const nextRecords = records.filter((record) => record.id !== recordId);

    persistRecords(nextRecords);
  }

  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-emerald-700">
              التواصل بين الأسرة والمدرسة
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-900">
              استدعاء ولي أمر
            </h1>

            <p className="mt-2 text-sm leading-7 text-slate-500">
              هذه الصفحة تعرض الاستدعاءات الصادرة، ثم يتم تسجيل حضور ولي الأمر
              ونتيجة المتابعة بعد الإصدار.
            </p>
          </div>

          <Link
            href="/dashboard/family-school-communication/guardian-summons/new"
            className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
          >
            إنشاء استدعاء ولي أمر
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث باسم الطالب، رقم الهوية، ولي الأمر، السبب..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-emerald-600"
          />

          <select
            value={attendanceFilter}
            onChange={(event) =>
              setAttendanceFilter(
                event.target.value as GuardianSummonsAttendanceStatus | "ALL"
              )
            }
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-emerald-600"
          >
            <option value="ALL">كل حالات الحضور</option>
            {attendanceOptions.map((status) => (
              <option key={status} value={status}>
                {guardianSummonsAttendanceLabels[status]}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
          عدد الاستدعاءات المحفوظة: {records.length} — المعروضة:{" "}
          {filteredRecords.length}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-7 gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 text-xs font-black text-slate-500">
          <div>الطالب</div>
          <div>ولي الأمر</div>
          <div>موعد الحضور</div>
          <div>السبب</div>
          <div>الحضور</div>
          <div>الحالة</div>
          <div>إجراءات</div>
        </div>

        {filteredRecords.length ? (
          <div className="divide-y divide-slate-100">
            {filteredRecords.map((record) => (
              <article
                key={record.id}
                className="grid grid-cols-7 gap-3 px-5 py-4 text-sm"
              >
                <div>
                  <p className="font-black text-slate-900">
                    {record.student?.fullName || "طالب غير محدد"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {[record.student?.grade, record.student?.classroom]
                      .filter(Boolean)
                      .join(" / ") || "لا توجد بيانات صف"}
                  </p>
                </div>

                <div>
                  <p className="font-bold text-slate-700">
                    {record.guardianName || "غير متوفر"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {record.guardianPhone || "لا يوجد رقم"}
                  </p>
                </div>

                <div>
                  <p className="font-bold text-slate-700">
                    {record.summonDay || "—"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {record.summonDate || "بدون تاريخ"} ·{" "}
                    {record.summonTime || "بدون وقت"}{" "}
                    {record.summonPeriod || ""}
                  </p>
                </div>

                <div>
                  <p className="line-clamp-3 leading-6 text-slate-600">
                    {record.summonReason || "غير محدد"}
                  </p>
                </div>

                <div>
                  <select
                    value={record.attendanceStatus || "PENDING"}
                    onChange={(event) =>
                      updateAttendanceStatus(
                        record.id,
                        event.target.value as GuardianSummonsAttendanceStatus
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none"
                  >
                    {attendanceOptions.map((status) => (
                      <option key={status} value={status}>
                        {guardianSummonsAttendanceLabels[status]}
                      </option>
                    ))}
                  </select>

                  <textarea
                    value={record.postNotes || ""}
                    onChange={(event) =>
                      updatePostNotes(record.id, event.target.value)
                    }
                    placeholder="ملاحظة بعد الحضور..."
                    rows={2}
                    className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs leading-5 outline-none"
                  />
                </div>

                <div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                    {guardianSummonsStatusLabels[record.status] ||
                      record.status ||
                      "صدر"}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <GuardianSummonsReportEnginePdfButton
                    payload={buildPdfPayloadFromRecord(record)}
                    fileName={buildPdfFileName(record)}
                    onAfterDownload={() => markDownloaded(record.id)}
                  >
                    تحميل الخطاب
                  </GuardianSummonsReportEnginePdfButton>

                  <Link
                    href="/dashboard/family-school-communication/guardian-summons/new"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-black text-slate-700 transition hover:bg-slate-50"
                  >
                    إنشاء جديد
                  </Link>

                  <button
                    type="button"
                    onClick={() => deleteRecord(record.id)}
                    className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100"
                  >
                    حذف
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center">
            <p className="text-sm font-black text-slate-500">
              لا توجد استدعاءات مطابقة.
            </p>

            <p className="mt-2 text-xs leading-6 text-slate-400">
              إن كنت أصدرت استدعاء ولم يظهر هنا، افتح صفحة الإنشاء مرة أخرى
              واضغط إصدار الاستدعاء، ثم ارجع لهذه الصفحة.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function buildPdfFileName(record: GuardianSummonsRecord) {
  const studentName = record.student?.fullName || "طالب";
  const date = record.summonDate || record.createdAt?.slice(0, 10) || "";
  return `استدعاء-ولي-أمر-${studentName}-${date}.pdf`;
}

function buildPdfPayloadFromRecord(record: GuardianSummonsRecord) {
  return {
    id: record.id,
    status: record.status,
    createdAt: record.createdAt,
    issuedAt: record.issuedAt,
    printedAt: record.printedAt,
    student: {
      id: record.student?.id || "",
      fullName: record.student?.fullName || "",
      nationalId: record.student?.nationalId || "",
      grade: record.student?.grade || "",
      classroom: record.student?.classroom || "",
      stage: record.student?.stage || "",
    },
    guardianName: record.guardianName,
    guardianPhone: record.guardianPhone,
    summonDay: record.summonDay,
    summonDate: record.summonDate,
    summonTime: record.summonTime,
    summonPeriod: record.summonPeriod,
    summonReason: record.summonReason,
    notes: record.notes,
  };
}

function normalizeRecord(record: Partial<GuardianSummonsRecord> | null) {
  if (!record || typeof record !== "object") {
    return null;
  }

  return {
    ...record,
    id: record.id || `summons-${Date.now()}`,
    guardianName: record.guardianName || record.student?.guardian?.name || "",
    guardianPhone: record.guardianPhone || record.student?.guardian?.phone || "",
    summonDay: record.summonDay || "الأحد",
    summonDate: record.summonDate || "",
    summonTime: record.summonTime || "",
    summonPeriod: record.summonPeriod || "",
    summonReason: record.summonReason || "",
    notes: record.notes || "",
    status: record.status || "ISSUED",
    attendanceStatus: record.attendanceStatus || "PENDING",
    postNotes: record.postNotes || "",
    createdAt: record.createdAt || new Date().toISOString(),
  };
}