export function isTransientCloudflareBodyFailure(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { transientBodyFailure?: unknown };
  return candidate.transientBodyFailure === true;
}
