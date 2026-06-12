const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export function extractYouTubeVideoId(input: string) {
  const value = input.trim();

  if (VIDEO_ID_PATTERN.test(value)) {
    return value;
  }

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && VIDEO_ID_PATTERN.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const watchId = url.searchParams.get("v");
      if (watchId && VIDEO_ID_PATTERN.test(watchId)) {
        return watchId;
      }

      const segments = url.pathname.split("/").filter(Boolean);
      const embeddedId = segments.find((segment, index) => {
        const previous = segments[index - 1];
        return (previous === "embed" || previous === "shorts" || previous === "live") && VIDEO_ID_PATTERN.test(segment);
      });

      return embeddedId ?? null;
    }
  } catch {
    const match = value.match(/[a-zA-Z0-9_-]{11}/);
    return match?.[0] ?? null;
  }

  return null;
}

export function toYouTubeWatchUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
