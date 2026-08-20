"use client";

import { SmartActionModal } from "@/components/ui/smart-action-modal";

export type PushCenterFeedback = {
  variant: "success" | "error" | "warning" | "info";
  title: string;
  description?: string;
};

export function PushCenterFeedbackModal({
  feedback,
  onClose,
}: {
  feedback: PushCenterFeedback | null;
  onClose: () => void;
}) {
  return (
    <SmartActionModal
      open={Boolean(feedback)}
      title={feedback?.title || ""}
      description={feedback?.description}
      variant={feedback?.variant || "info"}
      confirmLabel="متابعة"
      onConfirm={onClose}
      onClose={onClose}
      portal
    />
  );
}
