"use client";

import { useEffect, useState } from "react";
import {
  formatWorkflowHijriDate,
  parseWorkflowHijriDateInput,
} from "@/lib/workflows/workflow-date";

type HijriDateInputProps = {
  value: unknown;
  onChange: (value: string) => void;
  className?: string;
};

export function HijriDateInput({ value, onChange, className }: HijriDateInputProps) {
  const canonicalValue = String(value ?? "");
  const [draft, setDraft] = useState(() => formatWorkflowHijriDate(canonicalValue));

  useEffect(() => {
    setDraft(formatWorkflowHijriDate(canonicalValue));
  }, [canonicalValue]);

  return (
    <input
      type="text"
      inputMode="numeric"
      dir="ltr"
      value={draft}
      placeholder="يوم/شهر/سنة هـ"
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        const canonical = parseWorkflowHijriDateInput(next);
        if (canonical) onChange(canonical);
      }}
      onBlur={() => {
        if (!draft.trim()) {
          onChange("");
          return;
        }

        const canonical = parseWorkflowHijriDateInput(draft);
        if (!canonical) {
          setDraft("");
          onChange("");
        }
      }}
      className={className}
      aria-label="التاريخ الهجري"
    />
  );
}
