export function getRequestOrigin(request: Request) {
  const url = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    url.host;
  const proto =
    request.headers.get("x-forwarded-proto") ||
    url.protocol.replace(":", "") ||
    "http";

  return `${proto}://${host}`;
}
