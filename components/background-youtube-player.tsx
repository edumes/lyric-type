"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

type YouTubePlayerState = -1 | 0 | 1 | 2 | 3 | 5;

type YouTubePlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  setPlaybackRate: (suggestedRate: number) => void;
  getPlaybackRate: () => number;
  getCurrentTime: () => number;
  getPlayerState: () => YouTubePlayerState;
  cueVideoById: (videoId: string) => void;
  destroy: () => void;
};

type YouTubeEvent = {
  target: YouTubePlayer;
  data: YouTubePlayerState;
};

type YouTubeNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      width?: string;
      height?: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: (event: { target: YouTubePlayer }) => void;
        onStateChange?: (event: YouTubeEvent) => void;
        onError?: () => void;
      };
    },
  ) => YouTubePlayer;
};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export type BackgroundYouTubePlayerHandle = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  getCurrentTime: () => number;
  getPlaybackRate: () => number;
  getPlayerState: () => YouTubePlayerState | null;
};

type BackgroundYouTubePlayerProps = {
  videoId: string;
  active: boolean;
  playbackRate: number;
  onReady?: () => void;
  onStateChange?: (state: YouTubePlayerState) => void;
  onPlaybackError?: (message: string) => void;
};

let youtubeApiPromise: Promise<void> | null = null;

function loadYouTubeApi() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API can only load in the browser."));
  }

  if (window.YT?.Player) {
    return Promise.resolve();
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }

  youtubeApiPromise = new Promise<void>((resolve) => {
    const previousCallback = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve();
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return youtubeApiPromise;
}

const BackgroundYouTubePlayer = forwardRef<
  BackgroundYouTubePlayerHandle,
  BackgroundYouTubePlayerProps
>(function BackgroundYouTubePlayer(
  { videoId, active, playbackRate, onReady, onStateChange, onPlaybackError },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const latestVideoIdRef = useRef(videoId);
  const latestPlaybackRateRef = useRef(playbackRate);
  const [isReady, setIsReady] = useState(false);

  const applyPlaybackRate = useCallback((rate: number) => {
    try {
      playerRef.current?.setPlaybackRate(rate);
    } catch {
      onPlaybackError?.("This video does not support the selected speed.");
    }
  }, [onPlaybackError]);

  useImperativeHandle(
    ref,
    () => ({
      playVideo() {
        const player = playerRef.current;
        if (!player) {
          onPlaybackError?.("The YouTube player is not ready yet.");
          return;
        }

        player.playVideo();

        window.setTimeout(() => {
          const state = player.getPlayerState();
          if (state !== 1 && state !== 3) {
            onPlaybackError?.(
              "Playback did not start. The browser may have blocked autoplay with sound.",
            );
          }
        }, 1400);
      },
      pauseVideo() {
        playerRef.current?.pauseVideo();
      },
      seekTo(seconds: number) {
        playerRef.current?.seekTo(seconds, true);
      },
      setPlaybackRate(rate: number) {
        latestPlaybackRateRef.current = rate;
        applyPlaybackRate(rate);
      },
      getCurrentTime() {
        return playerRef.current?.getCurrentTime() ?? 0;
      },
      getPlaybackRate() {
        return playerRef.current?.getPlaybackRate() ?? latestPlaybackRateRef.current;
      },
      getPlayerState() {
        return playerRef.current?.getPlayerState() ?? null;
      },
    }),
    [applyPlaybackRate, onPlaybackError],
  );

  useEffect(() => {
    latestVideoIdRef.current = videoId;

    if (isReady) {
      playerRef.current?.cueVideoById(videoId);
      window.setTimeout(() => applyPlaybackRate(latestPlaybackRateRef.current), 200);
    }
  }, [applyPlaybackRate, isReady, videoId]);

  useEffect(() => {
    latestPlaybackRateRef.current = playbackRate;

    if (isReady) {
      applyPlaybackRate(playbackRate);
    }
  }, [applyPlaybackRate, isReady, playbackRate]);

  useEffect(() => {
    let isMounted = true;

    loadYouTubeApi()
      .then(() => {
        if (!isMounted || !hostRef.current || !window.YT?.Player) {
          return;
        }

        playerRef.current = new window.YT.Player(hostRef.current, {
          videoId: latestVideoIdRef.current,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            enablejsapi: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: () => {
              setIsReady(true);
              applyPlaybackRate(latestPlaybackRateRef.current);
              onReady?.();
            },
            onStateChange: (event) => {
              onStateChange?.(event.data);
            },
            onError: () => {
              onPlaybackError?.("The selected YouTube video could not be played.");
            },
          },
        });
      })
      .catch((error) => {
        onPlaybackError?.(
          error instanceof Error
            ? error.message
            : "Unable to load the YouTube IFrame API.",
        );
      });

    return () => {
      isMounted = false;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [applyPlaybackRate, onPlaybackError, onReady, onStateChange]);

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden transition-opacity duration-500"
        style={{
          filter: "blur(16px) brightness(0.35)",
          inset: 0,
          opacity: active ? 1 : 0,
          pointerEvents: "none",
          position: "fixed",
          transform: "scale(1.12)",
          zIndex: 0,
        }}
      >
        <div ref={hostRef} className="youtube-background h-screen w-screen" />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-black/65"
        style={{ zIndex: 1 }}
      />
    </>
  );
});

export { BackgroundYouTubePlayer };
