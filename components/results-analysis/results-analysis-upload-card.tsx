"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResultsAnalysisUploadCard() {
  const router = useRouter();

  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [grade, setGrade] = useState("");
  const [classroom, setClassroom] = useState("");
  const [semester, setSemester] = useState("");
  const [mergeSections, setMergeSections] = useState(true);
  const [loading, setLoading] = useState(false);

  async function uploadFile() {
    if (files.length === 0) {
      alert("اختر ملف Excel واحدًا على الأقل.");
      return;
    }

    setLoading(true);

    const formData = new FormData();

    for (const file of files) {
      formData.append("files", file);
    }

    formData.append("title", title);
    formData.append("grade", grade);
    formData.append("classroom", classroom);
    formData.append("semester", semester);
    formData.append("mergeSections", String(mergeSections));

    const response = await fetch("/api/dashboard/results-analysis", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      alert(data.error || "فشل تحليل الملف.");
      return;
    }

    router.push(`/dashboard/results-analysis/${data.analysisId}`);
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-900">بيانات التحليل</h2>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          يمكن رفع ملف واحد أو عدة ملفات Excel. ويمكن دمج الشعب أو تحليلها منفصلة عبر الفلاتر.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="عنوان التحليل" value={title} onChange={setTitle} placeholder="مثال: تحليل نتائج ثالث متوسط - الفصل الأول" />
        <Input label="الصف" value={grade} onChange={setGrade} placeholder="مثال: ثالث متوسط" />
        <Input label="الفصل/الشعبة" value={classroom} onChange={setClassroom} placeholder="مثال: أ أو اتركه فارغًا للكل" />
        <Input label="الترم الدراسي" value={semester} onChange={setSemester} placeholder="مثال: الفصل الأول" />

        <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
          <input
            type="checkbox"
            checked={mergeSections}
            onChange={(event) => setMergeSections(event.target.checked)}
          />
          دمج الشعب عند التحليل العام مع إبقاء إمكانية الفلترة حسب الشعبة
        </label>

        <div className="md:col-span-2 rounded-2xl border border-dashed border-blue-300 bg-blue-50 p-8">
          <label className="block text-sm font-black text-slate-700">
            ملفات Excel
          </label>

          <input
            multiple
            type="file"
            accept=".xlsx,.xls"
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            className="mt-4 block w-full text-sm"
          />

          {files.length > 0 ? (
            <div className="mt-4 rounded-xl bg-white p-4 text-sm text-slate-600">
              عدد الملفات المختارة: <b>{files.length}</b>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={uploadFile}
          disabled={loading}
          className="rounded-2xl bg-blue-600 px-8 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "جارٍ التحليل..." : "حفظ وبدء التحليل"}
        </button>
      </div>
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm font-black text-slate-700">{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400"
      />
    </div>
  );
}