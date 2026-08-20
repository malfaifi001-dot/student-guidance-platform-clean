export const PUSH_NOTIFICATION_TYPES = [
  "assignment",
  "case-update",
  "signature-request",
  "survey",
  "activity-assignment",
  "certificate-ready",
  "system-announcement",
] as const;

export type PushNotificationType = (typeof PUSH_NOTIFICATION_TYPES)[number];

export type TeachixPushPayload = {
  title: string;
  body: string;
  route: string;
  type: PushNotificationType;
  recordId?: string;
  campaignId?: string;
};

export function isPushNotificationType(value: unknown): value is PushNotificationType {
  return typeof value === "string" && PUSH_NOTIFICATION_TYPES.includes(value as PushNotificationType);
}

export function isSafePushPayload(payload: TeachixPushPayload): boolean {
  return (
    payload.title.length > 0 &&
    payload.title.length <= 120 &&
    payload.body.length > 0 &&
    payload.body.length <= 500 &&
    payload.route.startsWith("/dashboard") &&
    (!payload.recordId || /^[A-Za-z0-9_-]{1,128}$/.test(payload.recordId))
  );
}
