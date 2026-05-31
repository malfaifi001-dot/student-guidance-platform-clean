const fs = require("fs");

const path = "components/activation/admin-activations-center.tsx";
let content = fs.readFileSync(path, "utf8");

if (!content.includes("async function cancelActivation")) {
  content = content.replace(
`  async function rejectRequest(id: string) {`,
`  async function cancelActivation(subscriptionId: string) {
    const response = await fetch("/api/dashboard/admin/activations/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscriptionId,
      }),
    });

    const result = await response.json();
    setMessage(result.message || result.error || "تم تنفيذ العملية.");
    await load();
  }

  async function rejectRequest(id: string) {`
  );
}

/*
  استبدال أيقونة الحالة في الحسابات المفعلة بزر إلغاء واضح.
*/
content = content.replace(
`                {item.status === "ACTIVE" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-amber-500" />
                )}`,
`                {item.status === "ACTIVE" ? (
                  <button
                    type="button"
                    onClick={() => cancelActivation(item.id)}
                    className="inline-flex items-center gap-1 rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 transition hover:bg-amber-100"
                    title="إلغاء التفعيل"
                  >
                    <XCircle className="h-4 w-4" />
                    إلغاء التفعيل
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-400">
                    <XCircle className="h-4 w-4" />
                    غير مفعل
                  </span>
                )}`
);

fs.writeFileSync(path, content, "utf8");
console.log("تم إضافة زر إلغاء التفعيل للحسابات المفعلة.");
