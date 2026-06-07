"use client";

type GenderMode = "MALE" | "FEMALE";

type Props = {
  value: GenderMode;
  onChange: (value: GenderMode) => void;
};

export function ReportGenderToggle({ value, onChange }: Props) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => onChange("MALE")}
        className={`rounded-2xl px-5 py-3 text-sm font-black ${
          value === "MALE"
            ? "bg-blue-600 text-white"
            : "bg-slate-200 text-slate-700"
        }`}
      >
        طالب
      </button>

      <button
        type="button"
        onClick={() => onChange("FEMALE")}
        className={`rounded-2xl px-5 py-3 text-sm font-black ${
          value === "FEMALE"
            ? "bg-pink-600 text-white"
            : "bg-slate-200 text-slate-700"
        }`}
      >
        طالبة
      </button>
    </div>
  );
}