// react/MagmaPlayer.jsx
import React from "react";

// react/useMagmaPlayer.js
import { useRef, useEffect, useState, useCallback } from "react";
import { MagmaPlayer } from "../MagmaPlayer.js";
function useMagmaPlayer(options = {}) {
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
    onEnded
  } = options;
  const canvasRef = useRef(null);
  const playerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoWidth, setVideoWidth] = useState(0);
  const [videoHeight, setVideoHeight] = useState(0);
  const [error, setError] = useState(null);
  const callbacksRef = useRef({
    onReady,
    onError,
    onPlay,
    onPause,
    onTimeupdate,
    onEnded
  });
  useEffect(() => {
    callbacksRef.current = {
      onReady,
      onError,
      onPlay,
      onPause,
      onTimeupdate,
      onEnded
    };
  }, [onReady, onError, onPlay, onPause, onTimeupdate, onEnded]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !colorVideoSrc || !maskVideoSrc) {
      return;
    }
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    setIsReady(false);
    setIsPlaying(false);
    setIsPaused(true);
    setCurrentTime(0);
    setDuration(0);
    setVideoWidth(0);
    setVideoHeight(0);
    setError(null);
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
      }
    });
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
    autoSize
  ]);
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
    getRepeatCount
  };
}

// react/MagmaPlayer.jsx
import { jsx } from "react/jsx-runtime";
var MagmaPlayer2 = React.forwardRef(function MagmaPlayer3({
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
  onSeeked,
  onWarning,
  onSizechange,
  className,
  style,
  canvasStyle,
  repeatCount,
  ...rest
}, ref) {
  const {
    canvasRef,
    player,
    isReady,
    isPlaying,
    isPaused,
    currentTime,
    duration,
    videoWidth,
    videoHeight,
    error
  } = useMagmaPlayer({
    colorVideoSrc,
    maskVideoSrc,
    autoplay,
    useWebGL,
    targetFPS,
    strictDuration,
    fixedSize,
    maxSize,
    autoSize,
    onReady,
    onError,
    onPlay,
    onPause,
    onTimeupdate,
    onEnded
  });
  React.useImperativeHandle(ref, () => player, [player]);
  React.useEffect(() => {
    if (!player) return;
    if (repeatCount !== void 0) {
      player.setRepeatCount(repeatCount);
    }
  }, [player, repeatCount]);
  React.useEffect(() => {
    if (!player) return;
    const listeners = [];
    if (onSeeked) {
      const handler = (time) => onSeeked(time);
      player.on("seeked", handler);
      listeners.push({ event: "seeked", handler });
    }
    if (onWarning) {
      const handler = (warning) => onWarning(warning);
      player.on("warning", handler);
      listeners.push({ event: "warning", handler });
    }
    if (onSizechange) {
      const handler = (size) => onSizechange(size);
      player.on("sizechange", handler);
      listeners.push({ event: "sizechange", handler });
    }
    return () => {
      listeners.forEach(({ event, handler }) => {
        player.off(event, handler);
      });
    };
  }, [player, onSeeked, onWarning, onSizechange]);
  return /* @__PURE__ */ jsx("div", { className, style, ...rest, children: /* @__PURE__ */ jsx(
    "canvas",
    {
      ref: canvasRef,
      style: {
        display: "block",
        width: "100%",
        height: "100%",
        ...canvasStyle
      }
    }
  ) });
});
export {
  MagmaPlayer2 as MagmaPlayer,
  useMagmaPlayer
};
