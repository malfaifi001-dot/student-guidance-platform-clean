"use client";

import {
  AlertTriangle,
  ArrowDownToLine,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  History,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  PortfolioFeedbackPopCard,
  type PortfolioFeedback,
} from "@/components/portfolio/portfolio-feedback-pop-card";
import {
  EXPENSE_PAYMENT_METHOD_LABELS,
  EXPENSE_PAYMENT_SOURCE_TYPE_LABELS,
  EXPENSE_RECURRENCE_LABELS,
  EXPENSE_STATUS_LABELS,
  type AccountingDashboardData,
  type ExpensePaymentMethodKey,
  type ExpensePaymentSourceTypeKey,
  type ExpenseRecurrenceKey,
  type ExpenseStatusKey,
} from "@/lib/admin/accounting/accounting-types";

type Expense = AccountingDashboardData["expenses"][number];
type Category = AccountingDashboardData["categories"][number];
type PaymentSource = AccountingDashboardData["paymentSources"][number];

type ExpenseFormState = {
  title: string;
  vendor: string;
  categoryId: string;
  amountBeforeTax: string;
  taxAmount: string;
  currency: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: "DUE" | "CANCELED";
  isRecurring: boolean;
  recurrenceInterval: ExpenseRecurrenceKey | "";
  nextRenewalDate: string;
  notes: string;
};

type Filters = {
  search: string;
  status: "ALL" | ExpenseStatusKey;
  categoryId: string;
  paymentSourceId: string;
  vendor: string;
  recurring: "ALL" | "YES" | "NO";
  dateFrom: string;
  dateTo: string;
};

const emptyFilters: Filters = {
  search: "",
  status: "ALL",
  categoryId: "",
  paymentSourceId: "",
  vendor: "",
  recurring: "ALL",
  dateFrom: "",
  dateTo: "",
};

function dateInput(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function emptyExpense(categoryId = ""): ExpenseFormState {
  return {
    title: "",
    vendor: "",
    categoryId,
    amountBeforeTax: "0",
    taxAmount: "0",
    currency: "SAR",
    invoiceNumber: "",
    invoiceDate: todayInput(),
    dueDate: "",
    status: "DUE",
    isRecurring: false,
    recurrenceInterval: "",
    nextRenewalDate: "",
    notes: "",
  };
}

function expenseForm(expense: Expense): ExpenseFormState {
  return {
    title: expense.title,
    vendor: expense.vendor || "",
    categoryId: expense.categoryId,
    amountBeforeTax: String(expense.amountBeforeTax),
    taxAmount: String(expense.taxAmount),
    currency: expense.currency,
    invoiceNumber: expense.invoiceNumber || "",
    invoiceDate: dateInput(expense.invoiceDate),
    dueDate: dateInput(expense.dueDate),
    status: expense.effectiveStatus === "CANCELED" ? "CANCELED" : "DUE",
    isRecurring: expense.isRecurring,
    recurrenceInterval: expense.recurrenceInterval || "",
    nextRenewalDate: dateInput(expense.nextRenewalDate),
    notes: expense.notes || "",
  };
}

function formatMoney(value: number, currency = "SAR") {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "غير محدد";
  try {
    return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(
      new Date(value),
    );
  } catch {
    return "غير محدد";
  }
}

function statusClass(status: ExpenseStatusKey) {
  if (status === "PAID") return "bg-emerald-50 text-emerald-700";
  if (status === "OVERDUE") return "bg-rose-50 text-rose-700";
  if (status === "CANCELED") return "bg-slate-100 text-slate-500";
  return "bg-amber-50 text-amber-700";
}

export function AdminAccountingDashboard({
  initialData,
}: {
  initialData: AccountingDashboardData;
}) {
  const [data, setData] = useState(initialData);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<PortfolioFeedback | null>(null);
  const [expenseModal, setExpenseModal] = useState<"new" | Expense | null>(null);
  const [expenseFormState, setExpenseFormState] = useState<ExpenseFormState>(
    emptyExpense(initialData.categories[0]?.id),
  );
  const [paidExpense, setPaidExpense] = useState<Expense | null>(null);
  const [paidForm, setPaidForm] = useState({
    paymentSourceId: initialData.paymentSources[0]?.id || "",
    paymentMethod: "BANK_TRANSFER" as ExpensePaymentMethodKey,
    paidDate: todayInput(),
    reference: "",
  });
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null);
  const [categoryModal, setCategoryModal] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [sourceModal, setSourceModal] = useState(false);
  const [sourceForm, setSourceForm] = useState({
    name: "",
    type: "BANK_ACCOUNT" as ExpensePaymentSourceTypeKey,
    institutionName: "",
    maskedIdentifier: "",
    notes: "",
  });

  async function load(nextFilters = filters) {
    setBusy(true);
    try {
      const query = new URLSearchParams();
      Object.entries(nextFilters).forEach(([key, value]) => {
        if (value) query.set(key, value);
      });
      const response = await fetch(
        `/api/dashboard/admin/accounting/expenses?${query.toString()}`,
        { cache: "no-store" },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "تعذر تحميل المصروفات.");
      setData(payload as AccountingDashboardData);
      if (detailExpense) {
        setDetailExpense(
          (payload as AccountingDashboardData).expenses.find(
            (expense) => expense.id === detailExpense.id,
          ) || null,
        );
      }
    } catch (error) {
      setFeedback({
        type: "error",
        title: "تعذر التحميل",
        description: error instanceof Error ? error.message : "حاول مرة أخرى.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function jsonRequest(url: string, init: RequestInit, success: string) {
    setBusy(true);
    try {
      const response = await fetch(url, {
        ...init,
        headers: { "Content-Type": "application/json", ...init.headers },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "تعذر حفظ العملية.");
      await load();
      setFeedback({ type: "success", title: "تم الحفظ", description: payload.message || success });
      return true;
    } catch (error) {
      setFeedback({
        type: "error",
        title: "تعذر الحفظ",
        description: error instanceof Error ? error.message : "حاول مرة أخرى.",
      });
      return false;
    } finally {
      setBusy(false);
    }
  }

  function openNew() {
    setExpenseFormState(emptyExpense(data.categories[0]?.id || ""));
    setExpenseModal("new");
  }

  function openEdit(expense: Expense) {
    setExpenseFormState(expenseForm(expense));
    setExpenseModal(expense);
  }

  async function submitExpense(event: React.FormEvent) {
    event.preventDefault();
    const editing = expenseModal !== "new" && expenseModal;
    const ok = await jsonRequest(
      editing
        ? `/api/dashboard/admin/accounting/expenses/${editing.id}`
        : "/api/dashboard/admin/accounting/expenses",
      {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify({
          ...expenseFormState,
          amountBeforeTax: Number(expenseFormState.amountBeforeTax || 0),
          taxAmount: Number(expenseFormState.taxAmount || 0),
          recurrenceInterval: expenseFormState.recurrenceInterval || null,
        }),
      },
      editing ? "تم تحديث المصروف." : "تم إنشاء المصروف.",
    );
    if (ok) setExpenseModal(null);
  }

  function openPaid(expense: Expense) {
    setPaidForm({
      paymentSourceId: data.paymentSources[0]?.id || "",
      paymentMethod: "BANK_TRANSFER",
      paidDate: todayInput(),
      reference: "",
    });
    setPaidExpense(expense);
  }

  async function submitPaid(event: React.FormEvent) {
    event.preventDefault();
    if (!paidExpense) return;
    const ok = await jsonRequest(
      `/api/dashboard/admin/accounting/expenses/${paidExpense.id}/paid`,
      { method: "POST", body: JSON.stringify(paidForm) },
      "تم تسجيل السداد.",
    );
    if (ok) setPaidExpense(null);
  }

  function confirmCancel(expense: Expense) {
    setFeedback({
      type: "confirm",
      title: "إلغاء المصروف؟",
      description: "سيبقى المصروف وسجل تدقيقه محفوظين ولن يحذف أي تاريخ محاسبي.",
      confirmLabel: "إلغاء المصروف",
      onConfirm: () =>
        void jsonRequest(
          `/api/dashboard/admin/accounting/expenses/${expense.id}`,
          { method: "PATCH", body: JSON.stringify({ action: "cancel" }) },
          "تم إلغاء المصروف.",
        ),
    });
  }

  function confirmNextCycle(expense: Expense) {
    setFeedback({
      type: "confirm",
      title: "بدء دورة الاستحقاق التالية؟",
      description: `سيصبح تاريخ الاستحقاق ${formatDate(expense.nextRenewalDate)} مع بقاء جميع الدفعات السابقة محفوظة.`,
      confirmLabel: "بدء الدورة",
      onConfirm: () =>
        void jsonRequest(
          `/api/dashboard/admin/accounting/expenses/${expense.id}/next-cycle`,
          { method: "POST" },
          "تم بدء الدورة التالية.",
        ),
    });
  }

  async function submitCategory(event: React.FormEvent) {
    event.preventDefault();
    const ok = await jsonRequest(
      "/api/dashboard/admin/accounting/categories",
      { method: "POST", body: JSON.stringify({ name: categoryName }) },
      "تم إنشاء التصنيف.",
    );
    if (ok) {
      setCategoryName("");
      setCategoryModal(false);
    }
  }

  async function submitSource(event: React.FormEvent) {
    event.preventDefault();
    const ok = await jsonRequest(
      "/api/dashboard/admin/accounting/payment-sources",
      { method: "POST", body: JSON.stringify(sourceForm) },
      "تم إنشاء مصدر الدفع.",
    );
    if (ok) {
      setSourceModal(false);
      setSourceForm({ name: "", type: "BANK_ACCOUNT", institutionName: "", maskedIdentifier: "", notes: "" });
    }
  }

  async function uploadAttachment(expenseId: string, file: File) {
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch(
        `/api/dashboard/admin/accounting/expenses/${expenseId}/attachments`,
        { method: "POST", body: formData },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "تعذر رفع المرفق.");
      await load();
      setFeedback({ type: "success", title: "تم رفع المرفق", description: payload.message });
    } catch (error) {
      setFeedback({
        type: "error",
        title: "تعذر رفع المرفق",
        description: error instanceof Error ? error.message : "حاول مرة أخرى.",
      });
    } finally {
      setBusy(false);
    }
  }

  function confirmArchiveAttachment(expense: Expense, attachmentId: string) {
    setFeedback({
      type: "confirm",
      title: "أرشفة المرفق؟",
      description: "سيختفي من العرض مع بقاء العملية محفوظة في سجل التدقيق.",
      confirmLabel: "أرشفة",
      onConfirm: () =>
        void jsonRequest(
          `/api/dashboard/admin/accounting/expenses/${expense.id}/attachments/${attachmentId}`,
          { method: "DELETE" },
          "تمت أرشفة المرفق.",
        ),
    });
  }

  function exportCsv() {
    const rows = [
      ["العنوان", "المورد", "التصنيف", "قبل الضريبة", "الضريبة", "الإجمالي", "العملة", "الحالة", "تاريخ الفاتورة", "الاستحقاق", "تاريخ السداد", "مصدر الدفع", "دوري"],
      ...data.expenses.map((expense) => [
        expense.title,
        expense.vendor || "",
        expense.category.name,
        expense.amountBeforeTax,
        expense.taxAmount,
        expense.totalAmount,
        expense.currency,
        EXPENSE_STATUS_LABELS[expense.effectiveStatus],
        dateInput(expense.invoiceDate),
        dateInput(expense.dueDate),
        dateInput(expense.paidDate),
        expense.paymentSource?.name || "",
        expense.isRecurring ? "نعم" : "لا",
      ]),
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `teachix-expenses-${todayInput()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const maxCategoryTotal = useMemo(
    () => Math.max(1, ...data.categoryDistribution.map((item) => item.total)),
    [data.categoryDistribution],
  );

  return (
    <main dir="rtl" className="space-y-6">
      <section className="overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-7 text-white shadow-xl md:p-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black text-emerald-100">
              <CircleDollarSign className="h-4 w-4" /> إدارة تشغيلية داخلية
            </span>
            <h1 className="mt-5 text-3xl font-black md:text-5xl">المحاسبة والمصروفات</h1>
            <p className="mt-4 text-sm font-bold leading-8 text-slate-300">
              تابع المصروفات والفواتير التشغيلية، مصادر السداد، التجديدات، الإيصالات، وسجل التغييرات من مساحة ADMIN واحدة.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-black hover:bg-white/15">
              <ArrowDownToLine className="h-4 w-4" /> تصدير CSV
            </button>
            <button type="button" onClick={openNew} className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950">
              <Plus className="h-4 w-4" /> إنشاء مصروف
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard title="مصروفات هذا الشهر" value={formatMoney(data.metrics.monthExpense)} icon={<CircleDollarSign />} />
        <MetricCard title="مصروفات هذه السنة" value={formatMoney(data.metrics.yearExpense)} icon={<FileText />} />
        <MetricCard title="مستحق قريبًا" value={`${data.metrics.upcomingCount}`} hint={formatMoney(data.metrics.upcomingTotal)} icon={<CalendarClock />} tone="amber" />
        <MetricCard title="متأخر" value={`${data.metrics.overdueCount}`} hint={formatMoney(data.metrics.overdueTotal)} icon={<AlertTriangle />} tone="rose" />
        <MetricCard title="مدفوع" value={`${data.metrics.paidCount}`} icon={<CheckCircle2 />} tone="emerald" />
        <MetricCard title="تجديدات قادمة" value={`${data.metrics.renewalCount}`} hint={formatMoney(data.metrics.renewalTotal)} icon={<RefreshCw />} tone="sky" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-xl font-black text-slate-950">المصروفات والفواتير</h2><p className="mt-1 text-sm font-bold text-slate-500">حتى 200 نتيجة وفق الفلاتر الحالية.</p></div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setCategoryModal(true)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700">+ تصنيف</button>
              <button type="button" onClick={() => setSourceModal(true)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700">+ مصدر دفع</button>
            </div>
          </div>
          <ExpenseFilters filters={filters} setFilters={setFilters} categories={data.categories} paymentSources={data.paymentSources} busy={busy} onApply={() => void load()} onReset={() => { setFilters(emptyFilters); void load(emptyFilters); }} />
          <div className="mt-5 space-y-3">
            {data.expenses.length ? data.expenses.map((expense) => (
              <ExpenseCard key={expense.id} expense={expense} busy={busy} onDetail={() => setDetailExpense(expense)} onEdit={() => openEdit(expense)} onPaid={() => openPaid(expense)} onCancel={() => confirmCancel(expense)} onNextCycle={() => confirmNextCycle(expense)} />
            )) : <div className="rounded-2xl bg-slate-50 p-10 text-center text-sm font-black text-slate-400">لا توجد مصروفات مطابقة للفلاتر.</div>}
          </div>
        </div>

        <aside className="space-y-5">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-black text-slate-950">التوزيع حسب التصنيف</h2>
            <div className="mt-5 space-y-4">
              {data.categoryDistribution.length ? data.categoryDistribution.map((item) => (
                <div key={item.categoryId}>
                  <div className="flex justify-between gap-3 text-xs font-black"><span className="text-slate-700">{item.name}</span><span className="text-slate-500">{formatMoney(item.total)}</span></div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600" style={{ width: `${Math.max(4, item.total / maxCategoryTotal * 100)}%` }} /></div>
                </div>
              )) : <p className="text-sm font-bold text-slate-400">لا توجد بيانات بعد.</p>}
            </div>
          </section>
          <section className="rounded-[2rem] border border-sky-100 bg-sky-50 p-5">
            <h3 className="font-black text-sky-950">جاهزية التقارير</h3>
            <p className="mt-2 text-sm font-bold leading-7 text-sky-800">يمكن استخدام التواريخ والتصنيفات وسجلات الدفعات لاحقًا للتقارير الشهرية والسنوية وملخصات التصنيف دون تغيير البيانات.</p>
          </section>
        </aside>
      </section>

      {expenseModal ? <ExpenseModal mode={expenseModal} form={expenseFormState} setForm={setExpenseFormState} categories={data.categories} busy={busy} onSubmit={submitExpense} onClose={() => setExpenseModal(null)} /> : null}
      {paidExpense ? <PaidModal expense={paidExpense} form={paidForm} setForm={setPaidForm} paymentSources={data.paymentSources} busy={busy} onSubmit={submitPaid} onAddSource={() => { setPaidExpense(null); setSourceModal(true); }} onClose={() => setPaidExpense(null)} /> : null}
      {detailExpense ? <ExpenseDetailModal expense={detailExpense} busy={busy} onUpload={uploadAttachment} onArchiveAttachment={confirmArchiveAttachment} onClose={() => setDetailExpense(null)} /> : null}
      {categoryModal ? <SimpleModal title="إنشاء تصنيف مخصص" onClose={() => setCategoryModal(false)}><form onSubmit={submitCategory}><Field label="اسم التصنيف"><input required value={categoryName} onChange={(event) => setCategoryName(event.target.value)} className={inputClass} /></Field><SubmitButton busy={busy} /></form></SimpleModal> : null}
      {sourceModal ? <SimpleModal title="إنشاء مصدر دفع" onClose={() => setSourceModal(false)}><form onSubmit={submitSource} className="grid gap-4"><Field label="اسم المصدر"><input required value={sourceForm.name} onChange={(event) => setSourceForm((old) => ({ ...old, name: event.target.value }))} className={inputClass} placeholder="الحساب التشغيلي أو البطاقة الرئيسية" /></Field><Field label="النوع"><select value={sourceForm.type} onChange={(event) => setSourceForm((old) => ({ ...old, type: event.target.value as ExpensePaymentSourceTypeKey }))} className={inputClass}>{Object.entries(EXPENSE_PAYMENT_SOURCE_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field><Field label="البنك/الجهة"><input value={sourceForm.institutionName} onChange={(event) => setSourceForm((old) => ({ ...old, institutionName: event.target.value }))} className={inputClass} /></Field><Field label="معرّف مختصر آمن"><input value={sourceForm.maskedIdentifier} onChange={(event) => setSourceForm((old) => ({ ...old, maskedIdentifier: event.target.value }))} className={inputClass} placeholder="**** 1234" /></Field><Field label="ملاحظات"><textarea rows={3} value={sourceForm.notes} onChange={(event) => setSourceForm((old) => ({ ...old, notes: event.target.value }))} className={inputClass} /></Field><SubmitButton busy={busy} /></form></SimpleModal> : null}
      <PortfolioFeedbackPopCard feedback={feedback} loading={busy} onClose={() => !busy && setFeedback(null)} />
    </main>
  );
}

function MetricCard({ title, value, hint, icon, tone = "slate" }: { title: string; value: string; hint?: string; icon: React.ReactNode; tone?: "slate" | "amber" | "rose" | "emerald" | "sky" }) {
  const tones = { slate: "bg-slate-100 text-slate-700", amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700", emerald: "bg-emerald-50 text-emerald-700", sky: "bg-sky-50 text-sky-700" };
  return <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm"><span className={`grid h-10 w-10 place-items-center rounded-xl [&>svg]:h-5 [&>svg]:w-5 ${tones[tone]}`}>{icon}</span><p className="mt-4 text-[11px] font-black text-slate-400">{title}</p><p className="mt-1 text-xl font-black text-slate-950">{value}</p>{hint ? <p className="mt-1 text-xs font-bold text-slate-500">{hint}</p> : null}</article>;
}

function ExpenseFilters({ filters, setFilters, categories, paymentSources, busy, onApply, onReset }: { filters: Filters; setFilters: React.Dispatch<React.SetStateAction<Filters>>; categories: Category[]; paymentSources: PaymentSource[]; busy: boolean; onApply: () => void; onReset: () => void }) {
  return <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
    <div className="relative xl:col-span-2"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={filters.search} onChange={(event) => setFilters((old) => ({ ...old, search: event.target.value }))} className={`${inputClass} pr-9`} placeholder="بحث بالعنوان أو المورد أو رقم الفاتورة" /></div>
    <select value={filters.status} onChange={(event) => setFilters((old) => ({ ...old, status: event.target.value as Filters["status"] }))} className={inputClass}><option value="ALL">كل الحالات</option>{Object.entries(EXPENSE_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
    <select value={filters.categoryId} onChange={(event) => setFilters((old) => ({ ...old, categoryId: event.target.value }))} className={inputClass}><option value="">كل التصنيفات</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
    <input value={filters.vendor} onChange={(event) => setFilters((old) => ({ ...old, vendor: event.target.value }))} className={inputClass} placeholder="المورد" />
    <select value={filters.paymentSourceId} onChange={(event) => setFilters((old) => ({ ...old, paymentSourceId: event.target.value }))} className={inputClass}><option value="">كل مصادر الدفع</option>{paymentSources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}</select>
    <select value={filters.recurring} onChange={(event) => setFilters((old) => ({ ...old, recurring: event.target.value as Filters["recurring"] }))} className={inputClass}><option value="ALL">دوري وغير دوري</option><option value="YES">دوري فقط</option><option value="NO">غير دوري</option></select>
    <div className="grid grid-cols-2 gap-2"><input type="date" aria-label="من تاريخ" value={filters.dateFrom} onChange={(event) => setFilters((old) => ({ ...old, dateFrom: event.target.value }))} className={inputClass} /><input type="date" aria-label="إلى تاريخ" value={filters.dateTo} onChange={(event) => setFilters((old) => ({ ...old, dateTo: event.target.value }))} className={inputClass} /></div>
    <div className="flex gap-2 xl:col-span-4"><button type="button" disabled={busy} onClick={onApply} className="rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50">تطبيق الفلاتر</button><button type="button" disabled={busy} onClick={onReset} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-black text-slate-600">إعادة ضبط</button></div>
  </div>;
}

function ExpenseCard({ expense, busy, onDetail, onEdit, onPaid, onCancel, onNextCycle }: { expense: Expense; busy: boolean; onDetail: () => void; onEdit: () => void; onPaid: () => void; onCancel: () => void; onNextCycle: () => void }) {
  const status = expense.effectiveStatus;
  return <article className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <button type="button" onClick={onDetail} className="min-w-0 text-right"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-[11px] font-black ${statusClass(status)}`}>{EXPENSE_STATUS_LABELS[status]}</span>{expense.isRecurring ? <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-black text-sky-700">{expense.recurrenceInterval ? EXPENSE_RECURRENCE_LABELS[expense.recurrenceInterval] : "دوري"}</span> : null}<span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">{expense.category.name}</span></div><h3 className="mt-3 truncate text-lg font-black text-slate-950">{expense.title}</h3><p className="mt-1 text-xs font-bold text-slate-500">{[expense.vendor, expense.invoiceNumber ? `فاتورة ${expense.invoiceNumber}` : null, `استحقاق ${formatDate(expense.dueDate)}`].filter(Boolean).join(" · ")}</p>{expense.isRecurring ? <p className="mt-2 text-xs font-black text-sky-700">التجديد القادم: {formatDate(expense.nextRenewalDate)}</p> : null}{expense.paymentSource ? <p className="mt-2 text-xs font-black text-emerald-700">دُفع من: {expense.paymentSource.name}</p> : null}</button>
      <div className="shrink-0 xl:text-left"><p className="text-2xl font-black text-slate-950">{formatMoney(expense.totalAmount, expense.currency)}</p><p className="mt-1 text-xs font-bold text-slate-400">قبل الضريبة {formatMoney(expense.amountBeforeTax, expense.currency)}</p><div className="mt-3 flex flex-wrap gap-2 xl:justify-end"><button type="button" disabled={busy} onClick={onDetail} className="rounded-xl border px-3 py-2 text-xs font-black"><History className="inline h-3.5 w-3.5" /> التفاصيل</button><button type="button" disabled={busy} onClick={onEdit} className="rounded-xl border px-3 py-2 text-xs font-black"><Pencil className="inline h-3.5 w-3.5" /> تعديل</button>{status !== "PAID" && status !== "CANCELED" ? <button type="button" disabled={busy} onClick={onPaid} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white">تسجيل مدفوع</button> : null}{status === "PAID" && expense.isRecurring && expense.nextRenewalDate ? <button type="button" disabled={busy} onClick={onNextCycle} className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-black text-white">الدورة التالية</button> : null}{status !== "PAID" && status !== "CANCELED" ? <button type="button" disabled={busy} onClick={onCancel} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-black text-rose-600">إلغاء</button> : null}</div></div>
    </div>
  </article>;
}

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-black text-slate-600"><span>{label}</span><div className="mt-2">{children}</div></label>; }
function SubmitButton({ busy, label = "حفظ" }: { busy: boolean; label?: string }) { return <button disabled={busy} className="mt-2 rounded-2xl bg-teal-700 px-6 py-3 text-sm font-black text-white disabled:opacity-50">{busy ? "جارٍ الحفظ..." : label}</button>; }

function SimpleModal({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/55 p-4" dir="rtl"><section className={`my-6 w-full ${wide ? "max-w-5xl" : "max-w-xl"} rounded-[2rem] bg-white p-6 shadow-2xl`}><div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-xl font-black text-slate-950">{title}</h2><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>{children}</section></div>;
}

function ExpenseModal({ mode, form, setForm, categories, busy, onSubmit, onClose }: { mode: "new" | Expense; form: ExpenseFormState; setForm: React.Dispatch<React.SetStateAction<ExpenseFormState>>; categories: Category[]; busy: boolean; onSubmit: (event: React.FormEvent) => void; onClose: () => void }) {
  const total = Number(form.amountBeforeTax || 0) + Number(form.taxAmount || 0);
  return <SimpleModal title={mode === "new" ? "إنشاء مصروف" : "تعديل المصروف"} onClose={onClose} wide><form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Field label="العنوان"><input required value={form.title} onChange={(event) => setForm((old) => ({ ...old, title: event.target.value }))} className={inputClass} /></Field><Field label="المورد/مزود الخدمة"><input value={form.vendor} onChange={(event) => setForm((old) => ({ ...old, vendor: event.target.value }))} className={inputClass} /></Field><Field label="التصنيف"><select required value={form.categoryId} onChange={(event) => setForm((old) => ({ ...old, categoryId: event.target.value }))} className={inputClass}><option value="">اختر التصنيف</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field><Field label="المبلغ قبل الضريبة"><input type="number" min="0" step="0.01" required value={form.amountBeforeTax} onChange={(event) => setForm((old) => ({ ...old, amountBeforeTax: event.target.value }))} className={inputClass} /></Field><Field label="الضريبة"><input type="number" min="0" step="0.01" required value={form.taxAmount} onChange={(event) => setForm((old) => ({ ...old, taxAmount: event.target.value }))} className={inputClass} /></Field><Field label="الإجمالي"><div className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-black text-slate-900">{formatMoney(total, form.currency)}</div></Field><Field label="العملة"><input maxLength={3} required value={form.currency} onChange={(event) => setForm((old) => ({ ...old, currency: event.target.value.toUpperCase() }))} className={inputClass} /></Field><Field label="رقم الفاتورة/المرجع"><input value={form.invoiceNumber} onChange={(event) => setForm((old) => ({ ...old, invoiceNumber: event.target.value }))} className={inputClass} /></Field><Field label="تاريخ الفاتورة"><input type="date" value={form.invoiceDate} onChange={(event) => setForm((old) => ({ ...old, invoiceDate: event.target.value }))} className={inputClass} /></Field><Field label="تاريخ الاستحقاق"><input type="date" value={form.dueDate} onChange={(event) => setForm((old) => ({ ...old, dueDate: event.target.value }))} className={inputClass} /></Field><Field label="الحالة"><select disabled={mode !== "new" && mode.effectiveStatus === "PAID"} value={form.status} onChange={(event) => setForm((old) => ({ ...old, status: event.target.value as ExpenseFormState["status"] }))} className={inputClass}><option value="DUE">مستحق</option><option value="CANCELED">ملغي</option></select></Field><label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700"><input type="checkbox" checked={form.isRecurring} onChange={(event) => setForm((old) => ({ ...old, isRecurring: event.target.checked }))} /> مصروف متكرر</label>{form.isRecurring ? <><Field label="دورة التكرار"><select required value={form.recurrenceInterval} onChange={(event) => setForm((old) => ({ ...old, recurrenceInterval: event.target.value as ExpenseRecurrenceKey }))} className={inputClass}><option value="">اختر الدورة</option>{Object.entries(EXPENSE_RECURRENCE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field><Field label="التجديد القادم"><input type="date" required value={form.nextRenewalDate} onChange={(event) => setForm((old) => ({ ...old, nextRenewalDate: event.target.value }))} className={inputClass} /></Field></> : null}<Field label="ملاحظات"><textarea rows={4} value={form.notes} onChange={(event) => setForm((old) => ({ ...old, notes: event.target.value }))} className={inputClass} /></Field><div className="md:col-span-2 xl:col-span-3"><SubmitButton busy={busy} label={mode === "new" ? "إنشاء المصروف" : "حفظ التعديلات"} /></div></form></SimpleModal>;
}

function PaidModal({ expense, form, setForm, paymentSources, busy, onSubmit, onAddSource, onClose }: { expense: Expense; form: { paymentSourceId: string; paymentMethod: ExpensePaymentMethodKey; paidDate: string; reference: string }; setForm: React.Dispatch<React.SetStateAction<{ paymentSourceId: string; paymentMethod: ExpensePaymentMethodKey; paidDate: string; reference: string }>>; paymentSources: PaymentSource[]; busy: boolean; onSubmit: (event: React.FormEvent) => void; onAddSource: () => void; onClose: () => void }) {
  return <SimpleModal title="تسجيل سداد المصروف" onClose={onClose}><div className="mb-5 rounded-2xl bg-emerald-50 p-4"><p className="font-black text-emerald-950">{expense.title}</p><p className="mt-1 text-2xl font-black text-emerald-800">{formatMoney(expense.totalAmount, expense.currency)}</p></div>{paymentSources.length ? <form onSubmit={onSubmit} className="grid gap-4"><Field label="مصدر الدفع"><select required value={form.paymentSourceId} onChange={(event) => setForm((old) => ({ ...old, paymentSourceId: event.target.value }))} className={inputClass}>{paymentSources.map((source) => <option key={source.id} value={source.id}>{source.name} — {EXPENSE_PAYMENT_SOURCE_TYPE_LABELS[source.type]}</option>)}</select></Field><Field label="طريقة الدفع"><select value={form.paymentMethod} onChange={(event) => setForm((old) => ({ ...old, paymentMethod: event.target.value as ExpensePaymentMethodKey }))} className={inputClass}>{Object.entries(EXPENSE_PAYMENT_METHOD_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field><Field label="تاريخ السداد"><input type="date" required value={form.paidDate} onChange={(event) => setForm((old) => ({ ...old, paidDate: event.target.value }))} className={inputClass} /></Field><Field label="مرجع عملية السداد"><input value={form.reference} onChange={(event) => setForm((old) => ({ ...old, reference: event.target.value }))} className={inputClass} /></Field><SubmitButton busy={busy} label="تأكيد السداد" /></form> : <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center"><p className="text-sm font-black text-amber-900">أنشئ مصدر دفع منظمًا أولًا.</p><button type="button" onClick={onAddSource} className="mt-4 rounded-xl bg-amber-700 px-4 py-2 text-sm font-black text-white">إنشاء مصدر دفع</button></div>}</SimpleModal>;
}

function ExpenseDetailModal({ expense, busy, onUpload, onArchiveAttachment, onClose }: { expense: Expense; busy: boolean; onUpload: (expenseId: string, file: File) => Promise<void>; onArchiveAttachment: (expense: Expense, attachmentId: string) => void; onClose: () => void }) {
  return <SimpleModal title={expense.title} onClose={onClose} wide><div className="grid gap-5 lg:grid-cols-3"><section className="rounded-2xl border border-slate-200 p-4"><h3 className="font-black">بيانات المصروف</h3><dl className="mt-4 space-y-3 text-sm"><Detail label="الحالة" value={EXPENSE_STATUS_LABELS[expense.effectiveStatus]} /><Detail label="المورد" value={expense.vendor || "غير محدد"} /><Detail label="التصنيف" value={expense.category.name} /><Detail label="الإجمالي" value={formatMoney(expense.totalAmount, expense.currency)} /><Detail label="الاستحقاق" value={formatDate(expense.dueDate)} />{expense.isRecurring ? <Detail label="التجديد القادم" value={formatDate(expense.nextRenewalDate)} /> : null}<Detail label="دُفع من" value={expense.paymentSource?.name || "غير مسدد"} /><Detail label="منفذ السداد" value={expense.paidByName || "غير محدد"} /></dl></section><section className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between"><h3 className="font-black">المرفقات والإيصالات</h3><label className="cursor-pointer rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white"><Paperclip className="inline h-3.5 w-3.5" /> رفع<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={busy} className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onUpload(expense.id, file); event.currentTarget.value = ""; }} /></label></div><div className="mt-4 space-y-2">{expense.attachments.length ? expense.attachments.map((attachment) => <div key={attachment.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3"><a href={attachment.fileUrl} target="_blank" rel="noreferrer" className="min-w-0 truncate text-xs font-black text-sky-700">{attachment.originalFileName}</a><button type="button" onClick={() => onArchiveAttachment(expense, attachment.id)} className="text-rose-600"><Trash2 className="h-4 w-4" /></button></div>) : <p className="text-xs font-bold text-slate-400">لا توجد مرفقات.</p>}</div></section><section className="rounded-2xl border border-slate-200 p-4"><h3 className="font-black">سجل الدفعات</h3><div className="mt-4 space-y-3">{expense.payments.length ? expense.payments.map((payment) => <div key={payment.id} className="rounded-xl bg-emerald-50 p-3"><p className="font-black text-emerald-900">{formatMoney(payment.totalAmount, payment.currency)}</p><p className="mt-1 text-xs font-bold text-emerald-700">{payment.paymentSourceName} · {EXPENSE_PAYMENT_METHOD_LABELS[payment.paymentMethod]} · {formatDate(payment.paidAt)}</p><p className="mt-1 text-[11px] font-bold text-emerald-600">سجله: {payment.recordedByName || payment.recordedById}</p></div>) : <p className="text-xs font-bold text-slate-400">لا توجد دفعات.</p>}</div></section></div><section className="mt-5 rounded-2xl border border-slate-200 p-4"><h3 className="flex items-center gap-2 font-black"><History className="h-4 w-4" /> سجل التدقيق</h3><div className="mt-4 grid gap-3 md:grid-cols-2">{expense.audits.map((audit) => <div key={audit.id} className="rounded-xl bg-slate-50 p-3"><p className="text-sm font-black text-slate-900">{audit.summary}</p><p className="mt-1 text-xs font-bold text-slate-500">{audit.actorName || audit.actorUserId} · {formatDate(audit.createdAt)}</p></div>)}</div></section></SimpleModal>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-3"><dt className="font-bold text-slate-400">{label}</dt><dd className="text-left font-black text-slate-800">{value}</dd></div>; }
