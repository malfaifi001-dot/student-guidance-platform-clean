const fs = require("fs");

const path = "app/dashboard/onboarding/page.tsx";
let content = fs.readFileSync(path, "utf8");

if (!content.includes("async function skipOnboarding")) {
  content = content.replace(
`  async function submit(event: React.FormEvent<HTMLFormElement>) {`,
`  async function skipOnboarding() {
    setError("");

    try {
      setLoading(true);

      const response = await fetch("/api/dashboard/onboarding/skip", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر تخطي إعداد الحساب.");
      }

      window.location.href = data.redirectTo || "/dashboard";
    } catch (error) {
      setError(error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {`
  );
}

if (!content.includes("تخطي الآن")) {
  content = content.replace(
`          <button
            disabled={loading}
            className="rounded-2xl bg-slate-950 px-7 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "جاري الحفظ..." : "حفظ ودخول المنصة"}
          </button>`,
`          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={skipOnboarding}
              disabled={loading}
              className="rounded-2xl border border-slate-200 bg-white px-7 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              تخطي الآن
            </button>

            <button
              disabled={loading}
              className="rounded-2xl bg-slate-950 px-7 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? "جاري الحفظ..." : "حفظ ودخول المنصة"}
            </button>
          </div>`
  );
}

if (!content.includes("يمكنك تخطي هذه الخطوة الآن")) {
  content = content.replace(
`            هذه البيانات ستستخدم لاحقًا في التقارير الرسمية، هوية المدرسة، وملفات PDF.`,
`            هذه البيانات ستستخدم لاحقًا في التقارير الرسمية، هوية المدرسة، وملفات PDF.
            يمكنك تخطي هذه الخطوة الآن، لكن سيتم طلبها لاحقًا قبل استخدام التقارير الرسمية ورفع بيانات نور.`
  );
}

fs.writeFileSync(path, content, "utf8");

console.log("تمت إضافة تخطي onboarding مؤقت.");
