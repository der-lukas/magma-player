/**
 * MagmaPlayer - TypeScript definitions
 * A reusable player for compositing color and alpha mask videos
 * with perfect synchronization using a shared clock.
 */

/**
 * Error codes for programmatic error handling
 */
export const ERROR_CODES: {
  readonly INVALID_INPUT: "INVALID_INPUT";
  readonly VIDEO_LOAD_FAILED: "VIDEO_LOAD_FAILED";
  readonly VIDEO_LOAD_TIMEOUT: "VIDEO_LOAD_TIMEOUT";
  readonly DURATION_MISMATCH: "DURATION_MISMATCH";
  readonly WEBGL_INIT_FAILED: "WEBGL_INIT_FAILED";
  readonly CANVAS_REMOVED: "CANVAS_REMOVED";
};

/**
 * Custom error class for MagmaPlayer with error codes
 */
export class MagmaPlayerError extends Error {
  readonly name: "MagmaPlayerError";
  readonly code: string;
  readonly details: Record<string, any>;

  constructor(code: string, message: string, details?: Record<string, any>);
}

/**
 * Buffered time range
 */
export interface BufferedRange {
  start: number;
  end: number;
}

/**
 * Constructor options for MagmaPlayer
 */
export interface MagmaPlayerOptions {
  /** URL to color video (MP4) */
  colorVideoSrc: string;
  /** URL to alpha mask video (MP4, grayscale) */
  maskVideoSrc: string;
  /**
   * Canvas element to render to.
   * Can be:
   * - HTMLCanvasElement: Direct canvas element
   * - string: CSS selector (e.g., '#myCanvas' or '.canvas-class')
   * - () => HTMLCanvasElement | null: Function that returns canvas (useful for framework refs)
   */
  canvas: HTMLCanvasElement | string | (() => HTMLCanvasElement | null);
  /** Use WebGL for rendering (default: true) */
  useWebGL?: boolean;
  /** Autoplay on ready (default: true) */
  autoplay?: boolean;
  /** Target frame rate (default: 60, use 30/24 for battery saving) */
  targetFPS?: number;
  /** Callback when player is ready */
  onReady?: () => void;
  /** Callback for errors (receives MagmaPlayerError) */
  onError?: (error: MagmaPlayerError) => void;
  /** Throw error if video durations don't match (default: false) */
  strictDuration?: boolean;
  /**
   * Lock canvas to fixed size (width, height in pixels).
   * Video will be scaled to fit while maintaining aspect ratio.
   * If not provided, canvas will auto-size to video dimensions.
   */
  fixedSize?: { width: number; height: number };
  /**
   * Disable automatic canvas sizing (default: true).
   * If false, player will not call updateCanvasSize() automatically.
   * Ignored if fixedSize is set (fixedSize always prevents auto-sizing).
   */
  autoSize?: boolean;
  /**
   * Maximum canvas size (width, height in pixels).
   * Video will be scaled down to fit while maintaining aspect ratio.
   * Ignored if fixedSize is set.
   */
  maxSize?: { width: number; height: number };
  /**
   * Wait for canvas to be available before initializing (default: false).
   * Useful when canvas might not be in DOM yet (e.g., conditional rendering).
   * If true, will poll for canvas availability up to canvasTimeout.
   */
  waitForCanvas?: boolean;
  /**
   * Timeout in milliseconds for waiting for canvas (default: 5000).
   * Only used if waitForCanvas is true.
   */
  canvasTimeout?: number;
  /**
   * Pause rendering when canvas is not visible (default: true).
   * Uses IntersectionObserver to detect visibility and skip rendering when off-screen.
   * Set to false to always render, even when canvas is not visible.
   */
  pauseWhenHidden?: boolean;
}

/**
 * Event types emitted by MagmaPlayer
 */
export type MagmaPlayerEvent =
  | "ready"
  | "play"
  | "pause"
  | "timeupdate"
  | "ended"
  | "seeked"
  | "error"
  | "warning"
  | "sizechange";

/**
 * Event callback types
 */
export type MagmaPlayerEventMap = {
  ready: () => void;
  play: () => void;
  pause: () => void;
  timeupdate: (time: number) => void;
  ended: () => void;
  seeked: (time: number) => void;
  error: (error: MagmaPlayerError) => void;
  warning: (error: MagmaPlayerError) => void;
  sizechange: (size: { width: number; height: number }) => void;
};

/**
 * MagmaPlayer - A reusable player for compositing color and alpha mask videos
 * with perfect synchronization using a shared clock.
 *
 * @example
 * ```typescript
 * const player = new MagmaPlayer({
 *   colorVideoSrc: 'color.mp4',
 *   maskVideoSrc: 'mask.mp4',
 *   canvas: document.getElementById('canvas')
 * });
 * ```
 */
export class MagmaPlayer {
  /**
   * Create a new MagmaPlayer instance
   * @param options - Configuration options
   * @throws {MagmaPlayerError} If invalid parameters are provided
   */
  constructor(options: MagmaPlayerOptions);

  // Event system
  /**
   * Add an event listener
   * @param event - Event name
   * @param callback - Callback function
   * @example
   * ```typescript
   * player.on('ready', () => console.log('Player ready'));
   * player.on('timeupdate', (time) => console.log('Time:', time));
   * ```
   */
  on<K extends MagmaPlayerEvent>(
    event: K,
    callback: MagmaPlayerEventMap[K]
  ): void;

  /**
   * Remove an event listener
   * @param event - Event name
   * @param callback - Callback function to remove
   */
  off<K extends MagmaPlayerEvent>(
    event: K,
    callback: MagmaPlayerEventMap[K]
  ): void;

  /**
   * Emit an event (internal use)
   * @param event - Event name
   * @param args - Event arguments
   */
  emit<K extends MagmaPlayerEvent>(
    event: K,
    ...args: Parameters<MagmaPlayerEventMap[K]>
  ): void;

  // Playback control
  /**
   * Start playback
   * @throws {Error} If player is not initialized
   */
  play(): void;

  /**
   * Pause playback
   */
  pause(): void;

  /**
   * Seek to specific time (in seconds)
   * @param time - Time in seconds
   * @throws {Error} If player is not initialized
   */
  seek(time: number): void;

  /**
   * Reset to time 0 and pause
   */
  reset(): void;

  // Volume control
  /**
   * Set volume (0-1 range)
   * @param volume - Volume level (0.0 to 1.0)
   */
  setVolume(volume: number): void;

  /**
   * Get current volume (0-1)
   * @returns Volume level (0.0 to 1.0)
   */
  getVolume(): number;

  // Playback speed control
  /**
   * Set playback speed (0.25-4.0 range, default: 1.0)
   * @param rate - Playback rate (0.25 to 4.0)
   */
  setPlaybackRate(rate: number): void;

  /**
   * Get current playback rate
   * @returns Playback rate
   */
  getPlaybackRate(): number;

  // Time & duration getters
  /**
   * Get current playback time (in seconds)
   * @returns Current time in seconds
   */
  getCurrentTime(): number;

  /**
   * Get video duration (in seconds)
   * @returns Duration in seconds, or 0 if not loaded
   */
  getDuration(): number;

  /**
   * Get buffered time ranges
   * @returns Array of buffered time ranges
   */
  getBuffered(): BufferedRange[];

  // Loop control
  /**
   * Enable/disable looping
   * @param loop - Whether to loop (default: true)
   */
  setLoop(loop: boolean): void;

  /**
   * Get current loop setting
   * @returns Whether looping is enabled
   */
  getLoop(): boolean;

  // Repeat control
  /**
   * Set play count (-1 = infinite loop, 0 = don't play, 1 = play once, >1 = play that many times total)
   * Aligned with CSS animation-iteration-count semantics
   * @param count - Total number of times to play (-1 for infinite, 0 for don't play, 1 for once, >1 for that many total plays)
   */
  setRepeatCount(count: number): void;

  /**
   * Get current repeat count
   * @returns Current repeat count (-1 for infinite, 0 for don't play, 1 for once, >1 for finite repeat)
   */
  getRepeatCount(): number;

  // Utility methods
  /**
   * Check if currently playing
   * @returns True if playing, false otherwise
   */
  isPlaying(): boolean;

  /**
   * Check if currently paused
   * @returns True if paused, false otherwise
   */
  isPaused(): boolean;

  /**
   * Check if player is ready
   * @returns True if initialized and ready, false otherwise
   */
  isReady(): boolean;

  /**
   * Get video width in pixels
   * @returns Video width, or 0 if not loaded
   */
  getVideoWidth(): number;

  /**
   * Get video height in pixels
   * @returns Video height, or 0 if not loaded
   */
  getVideoHeight(): number;

  /**
   * Manually set canvas size
   * @param width - Canvas width in pixels
   * @param height - Canvas height in pixels
   */
  setSize(width: number, height: number): void;

  // Cleanup
  /**
   * Clean up and destroy player instance
   * Removes event listeners, stops playback, and frees resources
   */
  destroy(): void;

  // Internal initialization (can be called manually if needed)
  /**
   * Initialize the player (called automatically in constructor)
   * @returns Promise that resolves when initialization is complete
   */
  init(): Promise<void>;

  // Read-only properties (for compatibility)
  /**
   * Whether the player is currently playing (property access)
   * @deprecated Use isPlaying() method instead
   */
  readonly playing: boolean;
}

// Default export
export default MagmaPlayer;
