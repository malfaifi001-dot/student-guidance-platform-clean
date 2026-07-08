"use client";

import { isSpecialReportAiDisabledFieldKey } from "@/lib/special-report/catalog";

import {
  SpecialReportAiActions,
} from "@/components/special-report/special-report-ai-actions";

type SpecialReportFieldAiProps = {
  field: {
    key: string;
    label: string;
    type: string;
  };

  value: unknown;

  onChange: (
    key: string,
    value: unknown
  ) => void;
};

export function SpecialReportFieldAi({
  field,
  value,
  onChange,
}: SpecialReportFieldAiProps) {
  const isSpecialReportField =
    field.key.startsWith(
      "special_report_"
    );

  const isTextField =
    field.type === "TEXT" ||
    field.type === "TEXTAREA";

  if (
    !isSpecialReportField ||
    !isTextField ||
    isSpecialReportAiDisabledFieldKey(field.key)
  ) {
    return null;
  }

  return (
    <SpecialReportAiActions
      fieldKey={field.key}
      fieldLabel={field.label}
      value={value}
      onChange={onChange}
    />
  );
}
