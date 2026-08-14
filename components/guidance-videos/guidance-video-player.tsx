"use client";

import type { RefObject } from "react";

import type { GuidanceVideoPlayable } from "@/lib/guidance-videos/guidance-video-config";
import { buildYouTubeEmbedUrl } from "@/lib/guidance-videos/youtube";

export function GuidanceVideoPlayer({
  video,
  uploadedPlayerRef,
}: {
  video: GuidanceVideoPlayable;
  uploadedPlayerRef: RefObject<HTMLVideoElement | null>;
}) {
  if (video.sourceType === "YOUTUBE" && video.youtubeVideoId) {
    const embedUrl = buildYouTubeEmbedUrl(video.youtubeVideoId);
    if (!embedUrl) return null;

    return (
      <iframe
        key={video.id}
        src={embedUrl}
        title={video.title}
        className="h-full w-full border-0 bg-black"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }

  if (!video.mediaUrl) return null;

  return (
    <video
      key={video.id}
      ref={uploadedPlayerRef}
      src={video.mediaUrl}
      controls
      playsInline
      preload="metadata"
      className="h-full w-full bg-black object-contain"
    />
  );
}
