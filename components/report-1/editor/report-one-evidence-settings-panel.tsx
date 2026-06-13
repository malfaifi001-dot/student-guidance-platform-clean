"use client";

import type {
  ReportOneEvidenceSettings,
  ReportOneEvidenceSizePreset,
} from "./report-one-editor-types";

type ReportOneEvidenceSettingsPanelProps = {
  disabled?: boolean;
  settings: ReportOneEvidenceSettings;
  onChange: (settings: ReportOneEvidenceSettings) => void;
};

const sizePresets: Array<{
  id: ReportOneEvidenceSizePreset;
  label: string;
  width: number;
  height: number;
  aspectRatio: ReportOneEvidenceSettings["aspectRatio"];
}> = [
  {
    id: "NORMAL_82_82",
    label: "عادي 82×82",
    width: 82,
    height: 82,
    aspectRatio: "SQUARE_1_1",
  },
  {
    id: "LARGE_160_178",
    label: "160×178",
    width: 160,
    height: 178,
    aspectRatio: "PORTRAIT_3_4",
  },
  {
    id: "WIDE_120_58",
    label: "عرضي 120×58",
    width: 120,
    height: 58,
    aspectRatio: "LANDSCAPE_16_9",
  },
  {
    id: "PORTRAIT_70_95",
    label: "طولي 70×95",
    width: 70,
    height: 95,
    aspectRatio: "PORTRAIT_3_4",
  },
];

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;

  return Math.min(Math.max(value, min), max);
}

function ToggleButton({
  active,
  children,
  disabled,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!disabled) onClick();
      }}
      className={[
        "rounded-full px-4 py-2 text-xs font-black transition",
        active
          ? "bg-emerald-700 text-white shadow-sm"
          : "bg-slate-100 text-slate-500 hover:bg-slate-200",
        disabled ? "cursor-not-allowed opacity-60" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function ReportOneEvidenceSettingsPanel({
  disabled = false,
  settings,
  onChange,
}: ReportOneEvidenceSettingsPanelProps) {
  function patch(next: Partial<ReportOneEvidenceSettings>) {
    onChange({
      ...settings,
      ...next,
    });
  }

  function applyPreset(presetId: ReportOneEvidenceSizePreset) {
    const preset = sizePresets.find((item) => item.id === presetId);

    if (!preset) {
      patch({
        sizePreset: presetId,
      });
      return;
    }

    patch({
      sizePreset: preset.id,
      imageWidthMm: preset.width,
      imageHeightMm: preset.height,
      aspectRatio: preset.aspectRatio,
    });
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-950">
            3. إعدادات الشواهد
          </h3>

          <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
            اختر ظهور الشواهد وعددها وحجم الصورة.
          </p>
        </div>

        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
          مهم
        </span>
      </div>

      <div className="mt-5 space-y-5">
        <div className="grid grid-cols-[120px_1fr] items-center gap-3">
          <p className="text-xs font-black text-slate-700">عرض الشواهد</p>

          <div className="flex rounded-full bg-slate-100 p-1">
            <ToggleButton
              disabled={disabled}
              active={settings.enabled}
              onClick={() => patch({ enabled: true })}
            >
              ظاهر
            </ToggleButton>

            <ToggleButton
              disabled={disabled}
              active={!settings.enabled}
              onClick={() => patch({ enabled: false })}
            >
              مخفي
            </ToggleButton>
          </div>
        </div>

        <div className="grid grid-cols-[120px_1fr] items-center gap-3">
          <p className="text-xs font-black text-slate-700">
            عدد الشواهد في الصفحة
          </p>

          <div className="flex rounded-full bg-slate-100 p-1">
            {[1, 2, 4].map((count) => (
              <ToggleButton
                key={count}
                disabled={disabled}
                active={settings.perPage === count}
                onClick={() => patch({ perPage: count as 1 | 2 | 4 })}
              >
                {count}
              </ToggleButton>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-[120px_1fr] items-center gap-3">
          <p className="text-xs font-black text-slate-700">التسميات</p>

          <div className="flex rounded-full bg-slate-100 p-1">
            <ToggleButton
              disabled={disabled}
              active={settings.showCaptions}
              onClick={() => patch({ showCaptions: true })}
            >
              ظاهر
            </ToggleButton>

            <ToggleButton
              disabled={disabled}
              active={!settings.showCaptions}
              onClick={() => patch({ showCaptions: false })}
            >
              مخفي
            </ToggleButton>
          </div>
        </div>

        <div className="grid grid-cols-[120px_1fr] items-center gap-3">
          <p className="text-xs font-black text-slate-700">طريقة العرض</p>

          <div className="flex rounded-full bg-slate-100 p-1">
            <ToggleButton
              disabled={disabled}
              active={settings.fit === "contain"}
              onClick={() => patch({ fit: "contain" })}
            >
              احتواء
            </ToggleButton>

            <ToggleButton
              disabled={disabled}
              active={settings.fit === "cover"}
              onClick={() => patch({ fit: "cover" })}
            >
              قص وتعبئة
            </ToggleButton>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-black text-slate-700">
            أبعاد الصورة
          </p>

          <div className="grid grid-cols-2 gap-2">
            {sizePresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                disabled={disabled}
                onClick={() => applyPreset(preset.id)}
                className={[
                  "rounded-full px-4 py-3 text-xs font-black transition",
                  settings.sizePreset === preset.id
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                  disabled ? "cursor-not-allowed opacity-60" : "",
                ].join(" ")}
              >
                {preset.label}
              </button>
            ))}

            <button
              type="button"
              disabled={disabled}
              onClick={() => patch({ sizePreset: "CUSTOM" })}
              className={[
                "col-span-2 rounded-full px-4 py-3 text-xs font-black transition",
                settings.sizePreset === "CUSTOM"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                disabled ? "cursor-not-allowed opacity-60" : "",
              ].join(" ")}
            >
              مقاس مخصص
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] bg-slate-50 p-3">
          <label className="block">
            <span className="text-[11px] font-black text-slate-500">
              العرض mm
            </span>

            <input
              type="number"
              min={40}
              max={180}
              disabled={disabled}
              value={settings.imageWidthMm}
              onChange={(event) =>
                patch({
                  sizePreset: "CUSTOM",
                  imageWidthMm: clampNumber(Number(event.target.value), 40, 180),
                })
              }
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-black outline-none focus:border-emerald-600"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-black text-slate-500">
              الارتفاع mm
            </span>

            <input
              type="number"
              min={35}
              max={190}
              disabled={disabled}
              value={settings.imageHeightMm}
              onChange={(event) =>
                patch({
                  sizePreset: "CUSTOM",
                  imageHeightMm: clampNumber(Number(event.target.value), 35, 190),
                })
              }
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-black outline-none focus:border-emerald-600"
            />
          </label>

          <label className="col-span-2 block">
            <span className="text-[11px] font-black text-slate-500">
              المسافة بين الشواهد mm
            </span>

            <input
              type="number"
              min={2}
              max={12}
              disabled={disabled}
              value={settings.gapMm}
              onChange={(event) =>
                patch({
                  gapMm: clampNumber(Number(event.target.value), 2, 12),
                })
              }
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-black outline-none focus:border-emerald-600"
            />
          </label>
        </div>
      </div>
    </section>
  );
}