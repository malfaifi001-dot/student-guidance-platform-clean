"use client";

import { useEffect, useState } from "react";
import { SmartActionModal } from "@/components/ui/smart-action-modal";

export type TimetableProjectSummary = {
  id: string;
  name: string;
  academicYear: string;
  semester: string;
  status?: string;
};

export function TimetableProjectEditDialog({
  project,
  open,
  onClose,
  onSaved,
}: {
  project: TimetableProjectSummary;
  open: boolean;
  onClose: () => void;
  onSaved: (project: TimetableProjectSummary) => void;
}) {
  const [name, setName] = useState(project.name);
  const [academicYear, setAcademicYear] = useState(project.academicYear);
  const [semester, setSemester] = useState(project.semester);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(project.name);
    setAcademicYear(project.academicYear);
    setSemester(project.semester);
    setError("");
  }, [open, project]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `/api/dashboard/principal/timetable/projects/${project.id}/manage`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "METADATA",
            data: { name, academicYear, semester },
          }),
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || "تعذر حفظ بيانات المشروع.");
        return;
      }
      onSaved(result.project);
      onClose();
    } catch {
      setError("تعذر الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SmartActionModal
      open={open}
      title="تعديل بيانات المشروع"
      description="يُحفظ التعديل دون تغيير بيانات الجدول أو إعادة توليده."
      confirmLabel="حفظ التعديلات"
      cancelLabel="إلغاء"
      loading={saving}
      onConfirm={() => void save()}
      onClose={onClose}
    >
      <div className="grid gap-4">
        <DialogField label="اسم الجدول" value={name} onChange={setName} />
        <DialogField label="العام الدراسي" value={academicYear} onChange={setAcademicYear} />
        <DialogField label="الفصل الدراسي" value={semester} onChange={setSemester} />
        {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p> : null}
      </div>
    </SmartActionModal>
  );
}

export function TimetableProjectDeleteDialog({
  project,
  open,
  onClose,
  onDeleted,
}: {
  project: TimetableProjectSummary;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setConfirmation("");
      setError("");
    }
  }, [open]);

  async function remove() {
    if (confirmation.trim() !== project.name) {
      setError("اكتب اسم المشروع مطابقًا لتأكيد الحذف.");
      return;
    }
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(
        `/api/dashboard/principal/timetable/projects/${project.id}/manage`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectName: confirmation }),
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || "تعذر حذف المشروع.");
        return;
      }
      onDeleted();
      onClose();
    } catch {
      setError("تعذر الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SmartActionModal
      open={open}
      title="حذف مشروع الجدول"
      description="سيتم حذف مشروع الجدول وجميع بياناته المرتبطة مثل المعلمين والفصول والمواد والإسنادات والقيود والجداول المولدة وسجلات التشغيل التابعة له. لا يمكن التراجع عن هذا الإجراء."
      variant="danger"
      confirmLabel="تأكيد الحذف"
      cancelLabel="إلغاء"
      loading={deleting}
      onConfirm={() => void remove()}
      onClose={onClose}
    >
      <div className="grid gap-3">
        <p className="text-xs font-bold text-slate-600">اكتب اسم المشروع: <span className="font-black text-slate-950">{project.name}</span></p>
        <input
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-rose-400 focus:bg-white"
        />
        {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p> : null}
      </div>
    </SmartActionModal>
  );
}

function DialogField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-sky-400 focus:bg-white"
      />
    </label>
  );
}
