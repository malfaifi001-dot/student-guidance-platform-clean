const fs = require("fs");

const path = "components/dashboard/soft-blue-dashboard.tsx";
let content = fs.readFileSync(path, "utf8");

/*
  تحويل Hero من بطاقة طويلة إلى Banner نحيف.
*/

/* تصغير padding الهيرو */
content = content.replaceAll(
  `px-6 py-4`,
  `px-5 py-3`
);

content = content.replaceAll(
  `md:px-7`,
  `md:px-6`
);

/* تقليل عرض عمود الصورة */
content = content.replaceAll(
  `gap-4 lg:grid-cols-[1fr_220px]`,
  `gap-3 lg:grid-cols-[1fr_150px]`
);

/* تصغير صورة الشخصية */
content = content.replaceAll(
  `h-40 w-40`,
  `h-28 w-28`
);

content = content.replaceAll(
  `h-full w-full object-contain object-bottom p-2`,
  `h-full w-full object-contain object-bottom p-1`
);

/* تصغير عنوان صباح الخير والاسم */
content = content.replaceAll(
  `text-3xl font-black tracking-tight ${theme.primaryText} md:text-4xl`,
  `text-2xl font-black tracking-tight ${theme.primaryText} md:text-3xl`
);

content = content.replaceAll(
  `mt-2 text-2xl font-black text-slate-900 md:text-[1.7rem]`,
  `mt-1 text-xl font-black text-slate-900 md:text-2xl`
);

/* تقليل مساحة بيانات المسمى والمدرسة */
content = content.replaceAll(
  `mt-3 grid gap-1.5 text-[15px] font-bold text-slate-600 sm:inline-grid`,
  `mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[13px] font-bold text-slate-600 lg:justify-start`
);

/* تصغير badge لوحة اليوم */
content = content.replaceAll(
  `mb-3 inline-flex items-center gap-2 rounded-full`,
  `mb-2 inline-flex items-center gap-2 rounded-full`
);

content = content.replaceAll(
  `px-4 py-2 text-[12px] font-black`,
  `px-3 py-1.5 text-[12px] font-black`
);

/* تصغير رسالة اليوم */
content = content.replaceAll(
  `mt-3 inline-flex rounded-2xl border border-rose-100 bg-white/70 px-4 py-3 text-sm font-bold leading-7 text-rose-700 shadow-sm`,
  `mt-2 inline-flex rounded-2xl border border-rose-100 bg-white/70 px-3 py-2 text-[13px] font-bold leading-6 text-rose-700 shadow-sm`
);

content = content.replaceAll(
  `mt-3 inline-flex rounded-2xl border border-sky-100 bg-white/70 px-4 py-3 text-sm font-bold leading-7 text-sky-700 shadow-sm`,
  `mt-2 inline-flex rounded-2xl border border-sky-100 bg-white/70 px-3 py-2 text-[13px] font-bold leading-6 text-sky-700 shadow-sm`
);

/* تصغير الأزرار */
content = content.replaceAll(
  `mt-4 flex flex-wrap justify-center gap-3 lg:justify-start`,
  `mt-3 flex flex-wrap justify-center gap-2 lg:justify-start`
);

content = content.replaceAll(
  `rounded-2xl px-5 py-3 text-sm font-black`,
  `rounded-2xl px-4 py-2.5 text-[13px] font-black`
);

/* تقليل حجم الزخارف داخل الهيرو عشان ما ترفع الإحساس البصري */
content = content.replaceAll(
  `h-64 w-64`,
  `h-44 w-44`
);

content = content.replaceAll(
  `h-72 w-72`,
  `h-52 w-52`
);

content = content.replaceAll(
  `h-28 w-28`,
  `h-20 w-20`
);

/* تقليل الفراغ العام بين أقسام الداشبورد */
content = content.replaceAll(
  `space-y-3`,
  `space-y-2.5`
);

fs.writeFileSync(path, content, "utf8");

console.log("تم تحويل بطاقة الاسم إلى Banner أقصر بكثير.");
