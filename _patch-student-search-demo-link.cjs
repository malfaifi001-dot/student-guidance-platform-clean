const fs = require("fs");

const filePath = "components/students/student-record-search-client.tsx";
let text = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");

if (!text.includes("/dashboard/comprehensive-reference/demo")) {
  text = text.replace(
    `            <p className="mt-4 max-w-3xl text-sm font-bold leading-8 text-sky-50">
              اكتب اسم الطالب أو الصف أو ولي الأمر، وستظهر النتائج مباشرة.
            </p>`,
    `            <p className="mt-4 max-w-3xl text-sm font-bold leading-8 text-sky-50">
              اكتب اسم الطالب أو الصف أو ولي الأمر، وستظهر النتائج مباشرة.
            </p>

            <Link
              href="/dashboard/comprehensive-reference/demo"
              className="mt-5 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-black text-sky-800 transition hover:bg-sky-50"
            >
              عرض نموذج تخيلي
            </Link>`
  );
}

fs.writeFileSync(filePath, text, "utf8");
console.log("تمت إضافة رابط النموذج التخيلي.");
