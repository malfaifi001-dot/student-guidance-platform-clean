export function shouldLimitActiveSessions() {
  return process.env.AUTH_SINGLE_ACTIVE_SESSION === "true";
}
