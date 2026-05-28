type CaseValueRendererProps = {
  label: string;
  value: unknown;
};

function renderValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "نعم" : "لا";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "—";

    return (
      <div className="space-y-3">
        {value.map((item, index) => {
          if (item && typeof item === "object") {
            const row = item as Record<string, unknown>;

            return (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                {Object.entries(row)
                  .filter(([key]) => key !== "id")
                  .map(([key, itemValue]) => (
                    <p key={key} className="text-sm leading-7 text-slate-700">
                      <span className="font-black text-slate-900">{key}: </span>
                      {String(itemValue || "—")}
                    </p>
                  ))}
              </div>
            );
          }

          return (
            <span
              key={index}
              className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700"
            >
              {String(item)}
            </span>
          );
        })}
      </div>
    );
  }

  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;

    if (typeof objectValue.fullName === "string") return objectValue.fullName;
    if (typeof objectValue.name === "string") return objectValue.name;

    return "بيانات محفوظة";
  }

  return String(value);
}

export function CaseValueRenderer({ label, value }: CaseValueRendererProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
      <p className="text-xs font-black text-slate-400">{label}</p>
      <div className="mt-3 text-sm font-bold leading-7 text-slate-800">
        {renderValue(value)}
      </div>
    </div>
  );
}