/**
 * React hook for MagmaPlayer integration.
 * Handles automatic lifecycle management and provides player state.
 *
 * @example
 * ```jsx
 * function VideoPlayer({ colorSrc, maskSrc }) {
 *   const { player, canvasRef, isReady, isPlaying, error } = useMagmaPlayer({
 *     colorVideoSrc: colorSrc,
 *     maskVideoSrc: maskSrc,
 *     autoplay: true,
 *   });
 *
 *   return (
 *     <div>
 *       <canvas ref={canvasRef} />
 *       {isReady && (
 *         <button onClick={() => player?.isPlaying() ? player.pause() : player.play()}>
 *           {isPlaying ? 'Pause' : 'Play'}
 *         </button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */

import { useRef, useEffect, useState, useCallback } from "react";
import { MagmaPlayer } from "../MagmaPlayer.js";

/**
 * @typedef {Object} UseMagmaPlayerOptions
 * @property {string} colorVideoSrc - URL to color video (MP4)
 * @property {string} maskVideoSrc - URL to alpha mask video (MP4)
 * @property {boolean} [autoplay=true] - Autoplay on ready
 * @property {boolean} [useWebGL=true] - Use WebGL for rendering
 * @property {number} [targetFPS=60] - Target frame rate
 * @property {boolean} [strictDuration=false] - Throw error if video durations don't match
 * @property {{width: number, height: number}} [fixedSize] - Lock canvas to fixed size
 * @property {{width: number, height: number}} [maxSize] - Maximum canvas size
 * @property {boolean} [autoSize=true] - Enable automatic canvas sizing
 * @property {Function} [onReady] - Callback when player is ready
 * @property {Function} [onError] - Callback for errors
 * @property {Function} [onPlay] - Callback when playback starts
 * @property {Function} [onPause] - Callback when playback pauses
 * @property {Function} [onTimeupdate] - Callback for time updates (throttled)
 * @property {Function} [onEnded] - Callback when playback ends
 */

/**
 * React hook for MagmaPlayer
 * @param {UseMagmaPlayerOptions} options - Player configuration options
 * @returns {Object} Player state and controls
 */
export function useMagmaPlayer(options = {}) {
  const {
    colorVideoSrc,
    maskVideoSrc,
    autoplay = true,
    useWebGL = true,
    targetFPS = 60,
    strictDuration = false,
    fixedSize,
    maxSize,
    autoSize = true,
    onReady,
    onError,
    onPlay,
    onPause,
    onTimeupdate,
    onEnded,
  } = options;

  const canvasRef = useRef(null);
  const playerRef = useRef(null);

  // State
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoWidth, setVideoWidth] = useState(0);
  const [videoHeight, setVideoHeight] = useState(0);
  const [error, setError] = useState(null);

  // Store callbacks in refs to avoid recreating player when they change
  const callbacksRef = useRef({
    onReady,
    onError,
    onPlay,
    onPause,
    onTimeupdate,
    onEnded,
  });
  useEffect(() => {
    callbacksRef.current = {
      onReady,
      onError,
      onPlay,
      onPause,
      onTimeupdate,
      onEnded,
    };
  }, [onReady, onError, onPlay, onPause, onTimeupdate, onEnded]);

  // Initialize player
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !colorVideoSrc || !maskVideoSrc) {
      return;
    }

    // Clean up any existing player
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    // Reset state
    setIsReady(false);
    setIsPlaying(false);
    setIsPaused(true);
    setCurrentTime(0);
    setDuration(0);
    setVideoWidth(0);
    setVideoHeight(0);
    setError(null);

    // Create player
    const player = new MagmaPlayer({
      colorVideoSrc,
      maskVideoSrc,
      canvas,
      autoplay,
      useWebGL,
      targetFPS,
      strictDuration,
      fixedSize,
      maxSize,
      autoSize,
      onReady: () => {
        setIsReady(true);
        if (playerRef.current) {
          setDuration(playerRef.current.getDuration());
          setVideoWidth(playerRef.current.getVideoWidth());
          setVideoHeight(playerRef.current.getVideoHeight());
        }
        if (callbacksRef.current.onReady) {
          callbacksRef.current.onReady(player);
        }
      },
      onError: (err) => {
        setError(err);
        if (callbacksRef.current.onError) {
          callbacksRef.current.onError(err);
        }
      },
    });

    // Set up event listeners
    player.on("play", () => {
      setIsPlaying(true);
      setIsPaused(false);
      if (callbacksRef.current.onPlay) {
        callbacksRef.current.onPlay();
      }
    });

    player.on("pause", () => {
      setIsPlaying(false);
      setIsPaused(true);
      if (callbacksRef.current.onPause) {
        callbacksRef.current.onPause();
      }
    });

    player.on("timeupdate", (time) => {
      setCurrentTime(time);
      if (callbacksRef.current.onTimeupdate) {
        callbacksRef.current.onTimeupdate(time);
      }
    });

    player.on("ended", () => {
      setIsPlaying(false);
      setIsPaused(true);
      if (callbacksRef.current.onEnded) {
        callbacksRef.current.onEnded();
      }
    });

    player.on("sizechange", (size) => {
      setVideoWidth(size.width);
      setVideoHeight(size.height);
    });

    playerRef.current = player;

    // Cleanup
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [
    colorVideoSrc,
    maskVideoSrc,
    autoplay,
    useWebGL,
    targetFPS,
    strictDuration,
    fixedSize,
    maxSize,
    autoSize,
  ]);

  // Control methods
  const play = useCallback(() => {
    playerRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pause();
  }, []);

  const seek = useCallback((time) => {
    playerRef.current?.seek(time);
  }, []);

  const reset = useCallback(() => {
    playerRef.current?.reset();
  }, []);

  const setVolume = useCallback((volume) => {
    playerRef.current?.setVolume(volume);
  }, []);

  const setPlaybackRate = useCallback((rate) => {
    playerRef.current?.setPlaybackRate(rate);
  }, []);

  const setLoop = useCallback((loop) => {
    playerRef.current?.setLoop(loop);
  }, []);

  const setRepeatCount = useCallback((count) => {
    playerRef.current?.setRepeatCount(count);
  }, []);

  const getRepeatCount = useCallback(() => {
    return playerRef.current?.getRepeatCount() || 0;
  }, []);

  return {
    // Player instance (for advanced usage)
    player: playerRef.current,
    // Canvas ref (attach to <canvas> element)
    canvasRef,
    // State
    isReady,
    isPlaying,
    isPaused,
    currentTime,
    duration,
    videoWidth,
    videoHeight,
    error,
    // Control methods
    play,
    pause,
    seek,
    reset,
    setVolume,
    setPlaybackRate,
    setLoop,
    setRepeatCount,
    getRepeatCount,
  };
}
