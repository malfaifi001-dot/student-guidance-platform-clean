export function PrincipalComingSoonPage({ title }: { title: string }) {
  return <div dir="rtl" className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950"><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">قريبًا</span><h1 className="mt-5 text-3xl font-black">{title}</h1><p className="mt-3 font-bold text-slate-500">هذه الصفحة محجوزة للمرحلة القادمة، ولا توجد وظائف تجريبية أو بيانات وهمية.</p></div>;
}
