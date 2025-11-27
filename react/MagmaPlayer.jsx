/**
 * React component for MagmaPlayer integration.
 * Provides a declarative API similar to the Angular component.
 *
 * @example
 * ```jsx
 * <MagmaPlayer
 *   colorVideoSrc="color.mp4"
 *   maskVideoSrc="mask.mp4"
 *   fixedSize={{ width: 180, height: 180 }}
 *   autoplay={true}
 *   onReady={(player) => console.log('Ready:', player)}
 *   onError={(error) => console.error('Error:', error)}
 * />
 * ```
 */

import React from "react";
import { useMagmaPlayer } from "./useMagmaPlayer.js";

/**
 * @typedef {Object} MagmaPlayerProps
 * @property {string} colorVideoSrc - URL to color video (MP4)
 * @property {string} maskVideoSrc - URL to alpha mask video (MP4)
 * @property {boolean} [autoplay=true] - Autoplay on ready
 * @property {boolean} [useWebGL=true] - Use WebGL for rendering
 * @property {number} [targetFPS=60] - Target frame rate
 * @property {boolean} [strictDuration=false] - Throw error if video durations don't match
 * @property {{width: number, height: number}} [fixedSize] - Lock canvas to fixed size
 * @property {{width: number, height: number}} [maxSize] - Maximum canvas size
 * @property {boolean} [autoSize=true] - Enable automatic canvas sizing
 * @property {Function} [onReady] - Callback when player is ready (receives player instance)
 * @property {Function} [onError] - Callback for errors
 * @property {Function} [onPlay] - Callback when playback starts
 * @property {Function} [onPause] - Callback when playback pauses
 * @property {Function} [onTimeupdate] - Callback for time updates (throttled)
 * @property {Function} [onEnded] - Callback when playback ends
 * @property {Function} [onSeeked] - Callback when seek completes
 * @property {Function} [onWarning] - Callback for warnings
 * @property {Function} [onSizechange] - Callback when canvas size changes
 * @property {string} [className] - CSS class name for the canvas wrapper
 * @property {Object} [style] - Inline styles for the canvas wrapper
 * @property {Object} [canvasStyle] - Inline styles for the canvas element
 * @property {number} [repeatCount] - Number of times to repeat (-1 = infinite, 0 = don't play, 1 = once, >1 = total plays)
 */

/**
 * MagmaPlayer React Component
 * @param {MagmaPlayerProps & { playerRef?: React.Ref<MagmaPlayer> }} props - Component props
 */
export const MagmaPlayer = React.forwardRef(function MagmaPlayer(
  {
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
  },
  ref
) {
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
    error,
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
    onEnded,
  });

  // Expose player instance via ref
  React.useImperativeHandle(ref, () => player, [player]);

  // Set up repeat count
  React.useEffect(() => {
    if (!player) return;
    if (repeatCount !== undefined) {
      player.setRepeatCount(repeatCount);
    }
  }, [player, repeatCount]);

  // Set up additional event listeners for callbacks
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

  return (
    <div className={className} style={style} {...rest}>
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          ...canvasStyle,
        }}
      />
    </div>
  );
});

// Export player state and methods for advanced usage
export { useMagmaPlayer } from "./useMagmaPlayer.js";
