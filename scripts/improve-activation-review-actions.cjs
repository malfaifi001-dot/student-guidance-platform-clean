const fs = require("fs");

const path = "components/activation/admin-activations-center.tsx";
let content = fs.readFileSync(path, "utf8");

/*
  إضافة حالة مدة التفعيل لكل طلب + حالة الطلب الجاري.
*/
content = content.replace(
  `const [message, setMessage] = useState<string | null>(null);`,
  `const [message, setMessage] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [requestDays, setRequestDays] = useState<Record<string, string>>({});
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});`
);

/*
  تحديث دالة قبول الطلب لتأخذ مدة مخصصة من الصف.
*/
content = content.replace(
`  async function approveRequest(id: string) {
    const response = await fetch(
      \`/api/dashboard/admin/activations/bank-transfer/\${id}/approve\`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          days: 30,
        }),
      }
    );

    const result = await response.json();
    setMessage(result.message || result.error || "تم تنفيذ العملية.");
    await load();
  }`,
`  async function approveRequest(id: string) {
    setProcessingRequestId(id);

    const response = await fetch(
      \`/api/dashboard/admin/activations/bank-transfer/\${id}/approve\`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          days: Number(requestDays[id] || 30),
        }),
      }
    );

    const result = await response.json();
    setMessage(result.message || result.error || "تم تنفيذ العملية.");
    setProcessingRequestId(null);
    await load();
  }`
);

/*
  تحديث دالة الرفض لتأخذ سببًا اختياريًا من الصف.
*/
content = content.replace(
`  async function rejectRequest(id: string) {
    const response = await fetch(
      \`/api/dashboard/admin/activations/bank-transfer/\${id}/reject\`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "تم رفض الطلب من لوحة الأدمن.",
        }),
      }
    );

    const result = await response.json();
    setMessage(result.message || result.error || "تم تنفيذ العملية.");
    await load();
  }`,
`  async function rejectRequest(id: string) {
    setProcessingRequestId(id);

    const response = await fetch(
      \`/api/dashboard/admin/activations/bank-transfer/\${id}/reject\`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: rejectReason[id] || "تم رفض الطلب من لوحة الأدمن.",
        }),
      }
    );

    const result = await response.json();
    setMessage(result.message || result.error || "تم تنفيذ العملية.");
    setProcessingRequestId(null);
    await load();
  }`
);

/*
  تكبير عمود الإجراء واستبدال الأزرار الصغيرة بلوحة تحكم واضحة داخل الصف.
*/
content = content.replace(
`                  <td className="p-3">
                    {request.status === "PENDING" ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => approveRequest(request.id)}
                          className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white"
                        >
                          قبول
                        </button>
                        <button
                          type="button"
                          onClick={() => rejectRequest(request.id)}
                          className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-black text-white"
                        >
                          رفض
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-400">
                        تمت المعالجة
                      </span>
                    )}
                  </td>`,
`                  <td className="p-3">
                    {request.status === "PENDING" ? (
                      <div className="min-w-[320px] rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <div className="grid gap-2 md:grid-cols-[90px_1fr]">
                          <input
                            value={requestDays[request.id] || "30"}
                            onChange={(event) =>
                              setRequestDays((current) => ({
                                ...current,
                                [request.id]: event.target.value,
                              }))
                            }
                            placeholder="الأيام"
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-center text-xs font-black text-slate-700 outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
                          />

                          <input
                            value={rejectReason[request.id] || ""}
                            onChange={(event) =>
                              setRejectReason((current) => ({
                                ...current,
                                [request.id]: event.target.value,
                              }))
                            }
                            placeholder="سبب الرفض اختياري"
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
                          />
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={processingRequestId === request.id}
                            onClick={() => approveRequest(request.id)}
                            className="h-10 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {processingRequestId === request.id ? "جار التنفيذ..." : "قبول وتفعيل"}
                          </button>

                          <button
                            type="button"
                            disabled={processingRequestId === request.id}
                            onClick={() => rejectRequest(request.id)}
                            className="h-10 rounded-xl bg-rose-600 px-3 text-xs font-black text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60"
                          >
                            رفض الطلب
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-400">
                        تمت المعالجة
                      </span>
                    )}
                  </td>`
);

fs.writeFileSync(path, content, "utf8");

console.log("تم تحسين أزرار قبول/رفض طلبات التحويل.");
