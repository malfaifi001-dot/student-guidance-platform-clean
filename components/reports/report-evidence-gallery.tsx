type Props = {
  items: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    caption: string | null;
    visible: boolean;
  }>;
};

export function ReportEvidenceGallery({ items }: Props) {
  const visibleItems = items.filter((item) => item.visible);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 border-t border-slate-200 pt-8">
      <h2 className="mb-6 text-2xl font-black text-slate-900">الشواهد</h2>

      <div className="grid gap-4 md:grid-cols-2">
        {visibleItems.map((item) => (
          <figure
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
          >
            <img
              src={item.fileUrl}
              alt={item.fileName}
              className="h-56 w-full rounded-xl object-cover"
            />

            <figcaption className="mt-3 text-center text-sm font-bold text-slate-600">
              {item.caption || item.fileName}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}