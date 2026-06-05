const fs = require("fs");

const filePath = "components/dashboard/soft-blue-dashboard.tsx";
let text = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");

const before = text;

// إزالة أي رفع سابق حتى ما يتكرر
text = text.replace(
  /<aside className="-mt-\d+ grid min-h-0 grid-rows-\[([^\]]+)\] gap-3">/g,
  '<aside className="grid min-h-0 grid-rows-[$1] gap-3">'
);

// رفع العمود الأزرق بمحاذاة الكرت المقابل
text = text.replace(
  '<aside className="grid min-h-0 grid-rows-[330px_1fr] gap-3">',
  '<aside className="-mt-3 grid min-h-0 grid-rows-[330px_1fr] gap-3">'
);

text = text.replace(
  '<aside className="grid min-h-0 grid-rows-[190px_1fr] gap-3">',
  '<aside className="-mt-3 grid min-h-0 grid-rows-[330px_1fr] gap-3">'
);

// تثبيت ارتفاع كرت رشد حتى يبقى متوازن مع كروت الإحصاء
text = text.replace(
  'flex h-full flex-col justify-between rounded-[2rem] bg-gradient-to-br from-sky-700 to-cyan-500 p-5 text-white shadow-lg',
  'flex h-full flex-col justify-between rounded-[2rem] bg-gradient-to-br from-sky-700 to-cyan-500 p-5 text-white shadow-lg'
);

if (text === before) {
  console.log("لم يتم العثور على النص المتوقع، قد يكون الملف معدلًا بالفعل.");
} else {
  fs.writeFileSync(filePath, text, "utf8");
  console.log("تم رفع ومحاذاة الكرت الأزرق.");
}
