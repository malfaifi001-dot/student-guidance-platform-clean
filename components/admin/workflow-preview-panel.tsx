export function WorkflowPreviewPanel() {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white shadow-2xl">
      <p className="text-sm font-bold text-sky-300">
        Runtime Preview
      </p>

      <h2 className="mt-3 text-3xl font-black">
        معاينة الـ Runtime
      </h2>

      <p className="mt-4 leading-8 text-slate-300">
        هنا سيتم لاحقًا عرض النموذج الحقيقي كما سيظهر للموجه/الموجهة أثناء العمل.
      </p>
    </section>
  );
}