/**
 * Vanilla JS helper for creating and managing MagmaPlayer instances.
 * Simplifies common patterns and provides automatic cleanup.
 *
 * @example
 * ```javascript
 * import { createMagmaPlayer } from './magma/vanilla/createMagmaPlayer.js';
 *
 * const { player, destroy } = createMagmaPlayer({
 *   colorVideoSrc: 'color.mp4',
 *   maskVideoSrc: 'mask.mp4',
 *   canvas: '#my-canvas', // or pass canvas element directly
 *   autoplay: true,
 *   autoCleanup: true, // Default: automatically cleanup on page unload
 * });
 *
 * // Player is automatically initialized
 * // Automatic cleanup on page unload (if autoCleanup: true)
 * // Or call destroy() manually if needed
 * ```
 */

import { MagmaPlayer } from "../MagmaPlayer.js";

/**
 * Creates a MagmaPlayer instance with simplified API.
 * Automatically handles canvas resolution and optional cleanup.
 *
 * @param {Object} options - Player configuration
 * @param {string} options.colorVideoSrc - URL to color video
 * @param {string} options.maskVideoSrc - URL to mask video
 * @param {HTMLCanvasElement|string} options.canvas - Canvas element or CSS selector
 * @param {boolean} [options.autoplay=true] - Autoplay on ready
 * @param {boolean} [options.useWebGL=true] - Use WebGL
 * @param {number} [options.targetFPS=60] - Target FPS
 * @param {Object} [options.fixedSize] - Fixed canvas size {width, height}
 * @param {Object} [options.maxSize] - Max canvas size {width, height}
 * @param {boolean} [options.autoSize=true] - Enable automatic canvas sizing
 * @param {boolean} [options.strictDuration=false] - Throw error if video durations don't match
 * @param {boolean} [options.pauseWhenHidden=true] - Pause rendering when canvas is not visible
 * @param {boolean} [options.autoCleanup=true] - Automatically cleanup on page unload
 * @param {Function} [options.onReady] - Ready callback
 * @param {Function} [options.onError] - Error callback
 * @returns {Object} Player instance and destroy function
 *
 * @example
 * ```javascript
 * import { createMagmaPlayer } from './magma/vanilla/createMagmaPlayer.js';
 *
 * const { player } = createMagmaPlayer({
 *   colorVideoSrc: 'color.mp4',
 *   maskVideoSrc: 'mask.mp4',
 *   canvasSelector: '#my-canvas',
 *   autoCleanup: true, // Default: automatically cleanup on page unload
 * });
 * ```
 */
export function createMagmaPlayer(options = {}) {
  const {
    colorVideoSrc,
    maskVideoSrc,
    canvas,
    autoplay = true,
    useWebGL = true,
    targetFPS = 60,
    fixedSize,
    maxSize,
    autoSize = true,
    strictDuration = false,
    pauseWhenHidden = true,
    autoCleanup = true,
    onReady,
    onError,
  } = options;

  // Resolve canvas
  let canvasElement = canvas;
  if (typeof canvas === "string") {
    canvasElement = document.querySelector(canvas);
    if (!canvasElement) {
      throw new Error(`Canvas not found: ${canvas}`);
    }
  }

  if (!(canvasElement instanceof HTMLCanvasElement)) {
    throw new Error(
      "Canvas must be an HTMLCanvasElement or valid CSS selector"
    );
  }

  // Create player
  const player = new MagmaPlayer({
    colorVideoSrc,
    maskVideoSrc,
    canvas: canvasElement,
    autoplay,
    useWebGL,
    targetFPS,
    fixedSize,
    maxSize,
    autoSize,
    strictDuration,
    pauseWhenHidden,
    onReady,
    onError,
  });

  let unloadHandler = null;

  // Set up auto-cleanup if enabled
  if (autoCleanup) {
    unloadHandler = () => {
      player.destroy();
    };
    window.addEventListener("beforeunload", unloadHandler);
  }

  return {
    player,
    destroy: () => {
      if (unloadHandler) {
        window.removeEventListener("beforeunload", unloadHandler);
      }
      player.destroy();
    },
  };
}
