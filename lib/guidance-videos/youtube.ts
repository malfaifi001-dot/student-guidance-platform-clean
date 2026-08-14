export const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
]);

function normalizeVideoId(value: string | null | undefined) {
  const videoId = value?.trim() ?? "";
  return YOUTUBE_VIDEO_ID_PATTERN.test(videoId) ? videoId : null;
}

export function parseYouTubeVideoUrl(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw || raw.length > 500) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.hash
  ) {
    return null;
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === "youtu.be") {
    const parts = url.pathname.split("/").filter(Boolean);
    return parts.length === 1 ? normalizeVideoId(parts[0]) : null;
  }

  if (!YOUTUBE_HOSTS.has(hostname)) return null;

  if (url.pathname === "/watch") {
    return normalizeVideoId(url.searchParams.get("v"));
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length === 2 && parts[0] === "shorts") {
    return normalizeVideoId(parts[1]);
  }

  return null;
}

export function buildYouTubeWatchUrl(videoId: string) {
  const safeVideoId = normalizeVideoId(videoId);
  return safeVideoId
    ? `https://www.youtube.com/watch?v=${safeVideoId}`
    : null;
}

export function buildYouTubeEmbedUrl(videoId: string) {
  const safeVideoId = normalizeVideoId(videoId);
  return safeVideoId
    ? `https://www.youtube-nocookie.com/embed/${safeVideoId}`
    : null;
}
