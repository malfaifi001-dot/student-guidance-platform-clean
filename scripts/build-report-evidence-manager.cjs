const fs = require("fs");

const path = "components/reports/report-studio-editor.tsx";
let content = fs.readFileSync(path, "utf8");

/* 1) Add evidence local state */
content = content.replace(
`  const [previewVersion, setPreviewVersion] = useState(1);`,
`  const [previewVersion, setPreviewVersion] = useState(1);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>(
    report.evidenceItems
  );
  const [savingEvidence, setSavingEvidence] = useState(false);`
);

/* 2) visible evidence count uses local state */
content = content.replace(
`  const visibleEvidenceCount = report.evidenceItems.filter(
    (item) => item.visible
  ).length;`,
`  const visibleEvidenceCount = evidenceItems.filter((item) => item.visible).length;`
);

/* 3) Add evidence changed flag after visible count */
content = content.replace(
`  const renderedContent = useMemo(() => {
    return buildRenderedContent(blocks, workflowValueOverrides);
  }, [blocks, workflowValueOverrides]);`,
`  const evidenceChanged =
    JSON.stringify(
      evidenceItems.map((item) => ({
        id: item.id,
        caption: item.caption || "",
        visible: item.visible,
        sortOrder: item.sortOrder,
      }))
    ) !==
    JSON.stringify(
      report.evidenceItems.map((item) => ({
        id: item.id,
        caption: item.caption || "",
        visible: item.visible,
        sortOrder: item.sortOrder,
      }))
    );

  const renderedContent = useMemo(() => {
    return buildRenderedContent(blocks, workflowValueOverrides);
  }, [blocks, workflowValueOverrides]);`
);

/* 4) hasChanges includes evidence */
content = content.replace(
`    JSON.stringify(blocks) !== JSON.stringify(parsed.blocks) ||
    JSON.stringify(valueMap) !== JSON.stringify(initialOverrideMap);`,
`    JSON.stringify(blocks) !== JSON.stringify(parsed.blocks) ||
    JSON.stringify(valueMap) !== JSON.stringify(initialOverrideMap) ||
    evidenceChanged;`
);

/* 5) Save evidence helper before saveReport */
content = content.replace(
`  async function saveReport() {`,
`  async function saveEvidenceItems() {
    if (!evidenceChanged) {
      return;
    }

    const response = await fetch(\`/api/dashboard/reports/\${report.id}/evidence\`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: evidenceItems.map((item, index) => ({
          id: item.id,
          caption: item.caption || "",
          visible: item.visible,
          sortOrder: index,
        })),
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "تعذر حفظ الشواهد.");
    }

    if (Array.isArray(data.evidenceItems)) {
      setEvidenceItems(
        data.evidenceItems.map((item: EvidenceItem, index: number) => ({
          ...item,
          sortOrder: index,
        }))
      );
    }
  }

  async function saveReport() {`
);

/* 6) Save evidence inside saveReport */
content = content.replace(
`      const data = await response.json();

      if (!response.ok || !data.success) {`,
`      const data = await response.json();

      if (!response.ok || !data.success) {`
);

content = content.replace(
`      setFeedback({
        type: "success",
        title: "تم حفظ التعديلات",
        message:
          "تم حفظ التعديلات داخل التقرير فقط دون تغيير بيانات الحالة الأصلية.",
      });`,
`      if (evidenceChanged) {
        setSavingEvidence(true);
        await saveEvidenceItems();
        setSavingEvidence(false);
      }

      setFeedback({
        type: "success",
        title: "تم حفظ التعديلات",
        message:
          "تم حفظ النصوص والقيم والشواهد داخل التقرير فقط دون تغيير بيانات الحالة الأصلية.",
      });`
);

content = content.replace(
`    } finally {
      setSaving(false);
    }`,
`    } finally {
      setSaving(false);
      setSavingEvidence(false);
    }`
);

/* 7) Evidence update helpers before return */
content = content.replace(
`  function updateValue(fieldKey: string, value: string) {
    setValueMap((current) => ({
      ...current,
      [fieldKey]: value,
    }));
  }

  return (`,
`  function updateValue(fieldKey: string, value: string) {
    setValueMap((current) => ({
      ...current,
      [fieldKey]: value,
    }));
  }

  function updateEvidenceItem(
    id: string,
    patch: Partial<Pick<EvidenceItem, "caption" | "visible">>
  ) {
    setEvidenceItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function moveEvidenceItem(id: string, direction: "up" | "down") {
    setEvidenceItems((current) => {
      const index = current.findIndex((item) => item.id === id);

      if (index === -1) {
        return current;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const currentItem = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = currentItem;

      return next.map((item, order) => ({
        ...item,
        sortOrder: order,
      }));
    });
  }

  return (`
);

/* 8) Pass evidence state and handlers to EditorPanel */
content = content.replace(
`              report={report}
              title={title}
              blocks={blocks}
              valueMap={valueMap}
              locked={locked}
              onTitleChange={setTitle}
              onBlockChange={updateBlock}
              onValueChange={updateValue}
            />`,
`              report={report}
              title={title}
              blocks={blocks}
              valueMap={valueMap}
              evidenceItems={evidenceItems}
              locked={locked}
              onTitleChange={setTitle}
              onBlockChange={updateBlock}
              onValueChange={updateValue}
              onEvidenceChange={updateEvidenceItem}
              onEvidenceMove={moveEvidenceItem}
            />`
);

/* 9) Button text shows evidence saving */
content = content.replace(
`                {saving ? "جاري الحفظ..." : "حفظ التعديلات"}`,
`                {saving || savingEvidence ? "جاري الحفظ..." : "حفظ التعديلات"}`
);

/* 10) EditorPanel props */
content = content.replace(
`  valueMap,
  locked,
  onTitleChange,
  onBlockChange,
  onValueChange,
}: {
  activeTab: EditorTab;
  report: StudioReport;
  title: string;
  blocks: EditorialBlocks;
  valueMap: Record<string, string>;
  locked: boolean;
  onTitleChange: (value: string) => void;
  onBlockChange: (key: keyof EditorialBlocks, value: string) => void;
  onValueChange: (fieldKey: string, value: string) => void;
}) {`,
`  valueMap,
  evidenceItems,
  locked,
  onTitleChange,
  onBlockChange,
  onValueChange,
  onEvidenceChange,
  onEvidenceMove,
}: {
  activeTab: EditorTab;
  report: StudioReport;
  title: string;
  blocks: EditorialBlocks;
  valueMap: Record<string, string>;
  evidenceItems: EvidenceItem[];
  locked: boolean;
  onTitleChange: (value: string) => void;
  onBlockChange: (key: keyof EditorialBlocks, value: string) => void;
  onValueChange: (fieldKey: string, value: string) => void;
  onEvidenceChange: (
    id: string,
    patch: Partial<Pick<EvidenceItem, "caption" | "visible">>
  ) => void;
  onEvidenceMove: (id: string, direction: "up" | "down") => void;
}) {`
);

/* 11) Replace evidence tab UI */
const oldEvidenceStart = content.indexOf(`  if (activeTab === "evidence") {`);
const oldEvidenceEnd = content.indexOf(`  return (
    <div className="mt-4 space-y-4">
      <FieldCard
        title="قبل الاعتماد"`, oldEvidenceStart);

if (oldEvidenceStart === -1 || oldEvidenceEnd === -1) {
  throw new Error("لم أستطع تحديد قسم الشواهد القديم داخل EditorPanel.");
}

const newEvidenceBlock = `  if (activeTab === "evidence") {
    return (
      <EvidenceManager
        evidenceItems={evidenceItems}
        locked={locked}
        onEvidenceChange={onEvidenceChange}
        onEvidenceMove={onEvidenceMove}
      />
    );
  }

`;

content =
  content.slice(0, oldEvidenceStart) +
  newEvidenceBlock +
  content.slice(oldEvidenceEnd);

/* 12) Insert EvidenceManager before FieldCard */
content = content.replace(
`function FieldCard({`,
`function EvidenceManager({
  evidenceItems,
  locked,
  onEvidenceChange,
  onEvidenceMove,
}: {
  evidenceItems: EvidenceItem[];
  locked: boolean;
  onEvidenceChange: (
    id: string,
    patch: Partial<Pick<EvidenceItem, "caption" | "visible">>
  ) => void;
  onEvidenceMove: (id: string, direction: "up" | "down") => void;
}) {
  const visibleCount = evidenceItems.filter((item) => item.visible).length;

  return (
    <div className="mt-4 space-y-4">
      <FieldCard
        title="إدارة الشواهد"
        helper="رتّب الشواهد، اكتب عنوانًا مناسبًا لكل شاهد، وحدد ما يظهر في التقرير الرسمي."
      >
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-bold text-slate-500">كل الشواهد</p>
            <p className="mt-1 text-lg font-black text-slate-950">
              {evidenceItems.length}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-bold text-emerald-700">الظاهر في التقرير</p>
            <p className="mt-1 text-lg font-black text-emerald-800">
              {visibleCount}
            </p>
          </div>
        </div>

        {evidenceItems.length ? (
          <div className="space-y-3">
            {evidenceItems.map((item, index) => (
              <EvidenceEditorCard
                key={item.id}
                item={item}
                index={index}
                total={evidenceItems.length}
                locked={locked}
                onChange={onEvidenceChange}
                onMove={onEvidenceMove}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center">
            <p className="text-sm font-black text-slate-700">
              لا توجد شواهد مرتبطة بهذا التقرير.
            </p>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              أضف الشواهد من الحالة أو الخدمة، ثم أعد إنشاء التقرير أو اربطها بالتقرير.
            </p>
          </div>
        )}
      </FieldCard>
    </div>
  );
}

function EvidenceEditorCard({
  item,
  index,
  total,
  locked,
  onChange,
  onMove,
}: {
  item: EvidenceItem;
  index: number;
  total: number;
  locked: boolean;
  onChange: (
    id: string,
    patch: Partial<Pick<EvidenceItem, "caption" | "visible">>
  ) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}) {
  const image = isImageEvidence(item);

  return (
    <article
      className={[
        "overflow-hidden rounded-3xl border bg-white",
        item.visible ? "border-slate-200" : "border-slate-200 opacity-70",
      ].join(" ")}
    >
      <div className="grid gap-0 sm:grid-cols-[140px_minmax(0,1fr)]">
        <div className="flex h-36 items-center justify-center bg-slate-100">
          {image && item.fileUrl ? (
            <img
              src={item.fileUrl}
              alt={item.caption || item.fileName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="px-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl">
                📎
              </div>
              <p className="mt-2 line-clamp-2 text-xs font-bold text-slate-500">
                {item.fileName || "ملف"}
              </p>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-black text-slate-400">
                شاهد رقم {index + 1}
              </p>
              <p className="mt-1 line-clamp-1 text-sm font-black text-slate-900">
                {item.caption || item.fileName}
              </p>
            </div>

            <span
              className={[
                "rounded-full px-3 py-1 text-[11px] font-black",
                item.visible
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-500",
              ].join(" ")}
            >
              {item.visible ? "ظاهر" : "مخفي"}
            </span>
          </div>

          <input
            value={item.caption || ""}
            onChange={(event) =>
              onChange(item.id, {
                caption: event.target.value,
              })
            }
            disabled={locked}
            placeholder="عنوان الشاهد داخل التقرير..."
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onChange(item.id, {
                  visible: !item.visible,
                })
              }
              disabled={locked}
              className={[
                "rounded-xl px-3 py-2 text-xs font-black transition disabled:opacity-50",
                item.visible
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  : "bg-emerald-600 text-white hover:bg-emerald-700",
              ].join(" ")}
            >
              {item.visible ? "إخفاء من التقرير" : "إظهار في التقرير"}
            </button>

            <button
              type="button"
              onClick={() => onMove(item.id, "up")}
              disabled={locked || index === 0}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              رفع
            </button>

            <button
              type="button"
              onClick={() => onMove(item.id, "down")}
              disabled={locked || index === total - 1}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              خفض
            </button>

            {item.fileUrl ? (
              <a
                href={item.fileUrl}
                target="_blank"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50"
              >
                فتح الملف
              </a>
            ) : (
              <span className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">
                لا يوجد رابط للملف
              </span>
            )}
          </div>

          <p className="mt-3 text-[11px] leading-5 text-slate-400">
            {item.mimeType || "نوع غير محدد"}
            {item.size ? \` · \${formatFileSize(item.size)}\` : ""}
          </p>
        </div>
      </div>
    </article>
  );
}

function isImageEvidence(item: EvidenceItem) {
  return (
    item.mimeType?.startsWith("image/") ||
    /\\.(png|jpg|jpeg|webp|gif)$/i.test(item.fileName || item.fileUrl || "")
  );
}

function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) {
    return "حجم غير معروف";
  }

  if (size < 1024) {
    return \`\${size} B\`;
  }

  if (size < 1024 * 1024) {
    return \`\${Math.round(size / 1024)} KB\`;
  }

  return \`\${(size / (1024 * 1024)).toFixed(1)} MB\`;
}

function FieldCard({`
);

fs.writeFileSync(path, content, "utf8");

console.log("تم بناء Evidence Manager وربطه بالحفظ.");
