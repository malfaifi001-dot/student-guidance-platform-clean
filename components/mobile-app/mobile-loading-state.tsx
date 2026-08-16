export function MobileLoadingState({ label = "جارٍ التحميل" }: { label?: string }) {
  return (
    <div className="flex min-h-24 items-center justify-center gap-3 text-sm text-slate-500" role="status" aria-live="polite">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-[#3478B8]" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
