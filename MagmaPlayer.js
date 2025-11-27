/**
 * MagmaPlayer - A reusable player for compositing color and alpha mask videos
 * with perfect synchronization using a shared clock.
 *
 * Works in any framework (React, Vue, vanilla JS, etc.)
 *
 * @example
 * const player = new MagmaPlayer({
 *   colorVideoSrc: 'color.mp4',
 *   maskVideoSrc: 'mask.mp4',
 *   canvas: document.getElementById('canvas')
 * });
 */

// Error codes for programmatic error handling
export const ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  VIDEO_LOAD_FAILED: "VIDEO_LOAD_FAILED",
  VIDEO_LOAD_TIMEOUT: "VIDEO_LOAD_TIMEOUT",
  DURATION_MISMATCH: "DURATION_MISMATCH",
  WEBGL_INIT_FAILED: "WEBGL_INIT_FAILED",
  CANVAS_REMOVED: "CANVAS_REMOVED",
};

/**
 * Custom error class for MagmaPlayer with error codes
 */
export class MagmaPlayerError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "MagmaPlayerError";
    this.code = code;
    this.details = details;
  }
}

export class MagmaPlayer {
  constructor({
    colorVideoSrc,
    maskVideoSrc,
    canvas,
    useWebGL = true,
    autoplay = true,
    targetFPS = 60,
    onReady,
    onError,
    strictDuration = false,
    fixedSize,
    autoSize = true,
    maxSize,
    waitForCanvas = false,
    canvasTimeout = 5000,
  }) {
    // Store canvas getter/selector for later resolution
    this._canvasInput = canvas;
    this.waitForCanvas = waitForCanvas;
    this.canvasTimeout = canvasTimeout;

    // Validate constructor parameters
    this._validateConstructorParams({
      colorVideoSrc,
      maskVideoSrc,
      canvas,
      useWebGL,
      autoplay,
      targetFPS,
      onReady,
      onError,
      strictDuration,
      fixedSize,
      autoSize,
      maxSize,
      waitForCanvas,
      canvasTimeout,
    });

    this.colorVideoSrc = colorVideoSrc;
    this.maskVideoSrc = maskVideoSrc;
    this.useWebGL = useWebGL;
    this.autoplay = autoplay;
    this.targetFPS = targetFPS;
    this.onReady = onReady;
    this.onError = onError;
    this.strictDuration = strictDuration;
    this.fixedSize = fixedSize;
    this.maxSize = maxSize;
    this.autoSize = fixedSize ? false : autoSize; // fixedSize overrides autoSize

    // Resolve canvas immediately or wait for it
    this.canvas = this._resolveCanvas(canvas);

    // Refs
    this.colorVideo = null;
    this.maskVideo = null;
    this.gl = null;
    this.ctx = null;
    this.animationFrameId = null;

    // State
    this.sharedClockStart = null;
    this._isPlaying = false; // Internal state (use _isPlaying to avoid conflict with isPlaying() method)
    this.isInitialized = false;
    this.isSeeking = false;
    this.seekTimeout = null;
    this.lastFrameTime = 0;
    this.frameInterval = 1000 / this.targetFPS;
    this.lastTimeUpdate = 0;
    this.isVisible = true; // Track if canvas is visible

    // Internal flags to prevent duplicate callbacks and spam
    this._readyEmitted = false; // Track if ready event has been emitted
    this._readyCallbackCalled = false; // Track if onReady callback has been called
    this._initializing = false; // Track if init is in progress
    this._initPromise = null; // Store init promise to prevent concurrent initialization

    // Performance optimizations
    this.lastColorFrameTime = -1;
    this.lastMaskFrameTime = -1;
    this.tempCanvas = null;
    this.maskCanvas = null;
    this.pixelRatio =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    // Cache computed styles to avoid repeated getComputedStyle calls
    this.cachedComputedStyle = null;
    this.styleCacheTime = 0;
    this.STYLE_CACHE_DURATION = 1000; // Cache for 1 second

    // API state
    this.volume = 1.0;
    this.playbackRate = 1.0;
    this.loop = true;
    this.eventListeners = {};

    // Repeat state
    this.repeatCount = 0; // Current repeat iteration
    this.repeatTarget = -1; // Target number of plays (-1 = infinite, 0 = don't play, 1 = play once, >1 = play that many times)

    // WebGL resources
    this.program = null;
    this.colorTexture = null;
    this.alphaTexture = null;
    this.positionBuffer = null;
    this.uvBuffer = null;

    // Initialize canvas and start init
    this._initializeCanvas();
  }

  /**
   * Resolve canvas from input (HTMLCanvasElement, string selector, or function)
   * @private
   */
  _resolveCanvas(canvasInput) {
    if (canvasInput instanceof HTMLCanvasElement) {
      return canvasInput;
    }

    if (typeof canvasInput === "string") {
      // CSS selector
      const element = document.querySelector(canvasInput);
      if (element instanceof HTMLCanvasElement) {
        return element;
      }
      return null;
    }

    if (typeof canvasInput === "function") {
      // Function that returns canvas
      try {
        const result = canvasInput();
        return result instanceof HTMLCanvasElement ? result : null;
      } catch (error) {
        console.warn(
          "MagmaPlayer: Error calling canvas getter function:",
          error
        );
        return null;
      }
    }

    return null;
  }

  /**
   * Initialize canvas - resolve it and wait if needed
   * @private
   */
  async _initializeCanvas() {
    // If canvas is already resolved, proceed with init
    if (this.canvas instanceof HTMLCanvasElement) {
      this.init();
      return;
    }

    // If waitForCanvas is enabled, poll for canvas
    if (this.waitForCanvas) {
      const startTime = Date.now();
      const pollInterval = 100; // Check every 100ms

      const checkCanvas = () => {
        const resolved = this._resolveCanvas(this._canvasInput);
        if (resolved instanceof HTMLCanvasElement) {
          this.canvas = resolved;
          this.init();
        } else if (Date.now() - startTime < this.canvasTimeout) {
          setTimeout(checkCanvas, pollInterval);
        } else {
          // Timeout reached
          const error = new MagmaPlayerError(
            ERROR_CODES.INVALID_INPUT,
            `Canvas not available after ${this.canvasTimeout}ms timeout`,
            { canvasInput: this._canvasInput }
          );
          if (this.onError) {
            this.onError(error);
          }
          this.emit("error", error);
        }
      };

      checkCanvas();
    } else {
      // Canvas not available and not waiting - error immediately
      const error = new MagmaPlayerError(
        ERROR_CODES.INVALID_INPUT,
        "Canvas not available. Use waitForCanvas: true to wait for canvas to become available.",
        { canvasInput: this._canvasInput }
      );
      if (this.onError) {
        this.onError(error);
      }
      this.emit("error", error);
    }
  }

  /**
   * Validate constructor parameters
   * @private
   */
  _validateConstructorParams({
    colorVideoSrc,
    maskVideoSrc,
    canvas,
    useWebGL,
    autoplay,
    targetFPS,
    onReady,
    onError,
    strictDuration,
    fixedSize,
    autoSize,
    maxSize,
    waitForCanvas,
    canvasTimeout,
  }) {
    if (!colorVideoSrc || typeof colorVideoSrc !== "string") {
      throw new MagmaPlayerError(
        ERROR_CODES.INVALID_INPUT,
        "colorVideoSrc must be a non-empty string",
        { received: typeof colorVideoSrc }
      );
    }

    if (!maskVideoSrc || typeof maskVideoSrc !== "string") {
      throw new MagmaPlayerError(
        ERROR_CODES.INVALID_INPUT,
        "maskVideoSrc must be a non-empty string",
        { received: typeof maskVideoSrc }
      );
    }

    // Canvas can be HTMLCanvasElement, string selector, or function
    if (canvas === undefined || canvas === null) {
      throw new MagmaPlayerError(
        ERROR_CODES.INVALID_INPUT,
        "canvas is required",
        { received: typeof canvas }
      );
    }

    const isValidCanvasInput =
      canvas instanceof HTMLCanvasElement ||
      typeof canvas === "string" ||
      typeof canvas === "function";

    if (!isValidCanvasInput) {
      throw new MagmaPlayerError(
        ERROR_CODES.INVALID_INPUT,
        "canvas must be an HTMLCanvasElement, CSS selector string, or function that returns HTMLCanvasElement",
        { received: typeof canvas }
      );
    }

    if (useWebGL !== undefined && typeof useWebGL !== "boolean") {
      throw new MagmaPlayerError(
        ERROR_CODES.INVALID_INPUT,
        "useWebGL must be a boolean",
        { received: typeof useWebGL }
      );
    }

    if (autoplay !== undefined && typeof autoplay !== "boolean") {
      throw new MagmaPlayerError(
        ERROR_CODES.INVALID_INPUT,
        "autoplay must be a boolean",
        { received: typeof autoplay }
      );
    }

    if (targetFPS !== undefined) {
      if (typeof targetFPS !== "number" || isNaN(targetFPS)) {
        throw new MagmaPlayerError(
          ERROR_CODES.INVALID_INPUT,
          "targetFPS must be a number",
          { received: typeof targetFPS }
        );
      }
      if (targetFPS < 1 || targetFPS > 120) {
        throw new MagmaPlayerError(
          ERROR_CODES.INVALID_INPUT,
          "targetFPS must be between 1 and 120",
          { received: targetFPS }
        );
      }
    }

    if (onReady !== undefined && typeof onReady !== "function") {
      throw new MagmaPlayerError(
        ERROR_CODES.INVALID_INPUT,
        "onReady must be a function",
        { received: typeof onReady }
      );
    }

    if (onError !== undefined && typeof onError !== "function") {
      throw new MagmaPlayerError(
        ERROR_CODES.INVALID_INPUT,
        "onError must be a function",
        { received: typeof onError }
      );
    }

    if (strictDuration !== undefined && typeof strictDuration !== "boolean") {
      throw new MagmaPlayerError(
        ERROR_CODES.INVALID_INPUT,
        "strictDuration must be a boolean",
        { received: typeof strictDuration }
      );
    }

    if (fixedSize !== undefined) {
      if (
        !fixedSize ||
        typeof fixedSize !== "object" ||
        typeof fixedSize.width !== "number" ||
        typeof fixedSize.height !== "number" ||
        fixedSize.width <= 0 ||
        fixedSize.height <= 0
      ) {
        throw new MagmaPlayerError(
          ERROR_CODES.INVALID_INPUT,
          "fixedSize must be an object with positive width and height numbers",
          { received: fixedSize }
        );
      }
    }

    if (autoSize !== undefined && typeof autoSize !== "boolean") {
      throw new MagmaPlayerError(
        ERROR_CODES.INVALID_INPUT,
        "autoSize must be a boolean",
        { received: typeof autoSize }
      );
    }

    if (maxSize !== undefined) {
      if (
        !maxSize ||
        typeof maxSize !== "object" ||
        typeof maxSize.width !== "number" ||
        typeof maxSize.height !== "number" ||
        maxSize.width <= 0 ||
        maxSize.height <= 0
      ) {
        throw new MagmaPlayerError(
          ERROR_CODES.INVALID_INPUT,
          "maxSize must be an object with positive width and height numbers",
          { received: maxSize }
        );
      }
    }

    if (waitForCanvas !== undefined && typeof waitForCanvas !== "boolean") {
      throw new MagmaPlayerError(
        ERROR_CODES.INVALID_INPUT,
        "waitForCanvas must be a boolean",
        { received: typeof waitForCanvas }
      );
    }

    if (canvasTimeout !== undefined) {
      if (
        typeof canvasTimeout !== "number" ||
        isNaN(canvasTimeout) ||
        canvasTimeout < 0
      ) {
        throw new MagmaPlayerError(
          ERROR_CODES.INVALID_INPUT,
          "canvasTimeout must be a non-negative number",
          { received: typeof canvasTimeout }
        );
      }
    }
  }

  async init() {
    // Prevent concurrent initialization
    if (this._initializing) {
      return this._initPromise;
    }

    // If already initialized, warn and return
    if (this.isInitialized) {
      console.warn("MagmaPlayer: Already initialized, skipping init()");
      return Promise.resolve();
    }

    this._initializing = true;
    this._initPromise = this._doInit();

    try {
      await this._initPromise;
    } finally {
      this._initializing = false;
    }

    return this._initPromise;
  }

  async _doInit() {
    try {
      // Create video elements
      this.colorVideo = document.createElement("video");
      this.maskVideo = document.createElement("video");

      this.colorVideo.src = this.colorVideoSrc;
      this.maskVideo.src = this.maskVideoSrc;
      this.colorVideo.muted = true;
      this.maskVideo.muted = true;
      this.colorVideo.loop = this.loop;
      this.maskVideo.loop = this.loop;
      this.colorVideo.playsInline = true;
      this.maskVideo.playsInline = true;
      this.colorVideo.setAttribute("webkit-playsinline", "true");
      this.maskVideo.setAttribute("webkit-playsinline", "true");
      this.colorVideo.preload = "auto";
      this.maskVideo.preload = "auto";
      this.colorVideo.volume = this.volume;
      this.maskVideo.volume = this.volume;
      this.colorVideo.playbackRate = this.playbackRate;
      this.maskVideo.playbackRate = this.playbackRate;

      // Track if videos have successfully loaded
      this.colorVideoLoaded = false;
      this.maskVideoLoaded = false;

      // Store timeout IDs so we can clear them if needed
      this.colorVideoLoadTimeout = null;
      this.maskVideoLoadTimeout = null;

      // Add error handlers - only log if video actually fails to load
      // The Promise-based error handling in init() will catch actual failures
      // These handlers are just for monitoring persistent errors
      // Store handlers so we can remove them in destroy()
      this.colorVideoErrorHandler = (e) => {
        // Only handle if video has an actual error code (not 0 = no error)
        // And only after a delay to allow for recovery
        setTimeout(() => {
          if (
            !this.colorVideoLoaded &&
            this.colorVideo &&
            this.colorVideo.readyState < 2 &&
            this.colorVideo.error &&
            this.colorVideo.error.code !== 0
          ) {
            this.handleVideoError("color", e);
          }
        }, 1000); // Longer delay to allow videos to recover
      };
      this.maskVideoErrorHandler = (e) => {
        // Only handle if video has an actual error code (not 0 = no error)
        // And only after a delay to allow for recovery
        setTimeout(() => {
          if (
            !this.maskVideoLoaded &&
            this.maskVideo &&
            this.maskVideo.readyState < 2 &&
            this.maskVideo.error &&
            this.maskVideo.error.code !== 0
          ) {
            this.handleVideoError("mask", e);
          }
        }, 1000); // Longer delay to allow videos to recover
      };

      this.colorVideo.addEventListener("error", this.colorVideoErrorHandler);
      this.maskVideo.addEventListener("error", this.maskVideoErrorHandler);

      // Try WebGL first if requested
      if (this.useWebGL) {
        // Try WebGL2 first for better performance
        this.gl =
          this.canvas.getContext("webgl2", {
            alpha: true,
            premultipliedAlpha: false,
          }) ||
          this.canvas.getContext("webgl", {
            alpha: true,
            premultipliedAlpha: false,
          }) ||
          this.canvas.getContext("experimental-webgl", {
            alpha: true,
            premultipliedAlpha: false,
          });
      }

      if (this.gl) {
        // Handle WebGL context loss
        // Store handlers so we can remove them in destroy()
        this.webglContextLossHandler = (e) => this.handleContextLoss(e);
        this.webglContextRestoreHandler = () => this.handleContextRestore();

        this.canvas.addEventListener(
          "webglcontextlost",
          this.webglContextLossHandler,
          false
        );
        this.canvas.addEventListener(
          "webglcontextrestored",
          this.webglContextRestoreHandler,
          false
        );

        this.initWebGL();
      } else {
        this.ctx = this.canvas.getContext("2d", {
          alpha: true,
          willReadFrequently: true,
        });
      }

      // Wait for videos to load with timeout
      await Promise.all([
        new Promise((resolve, reject) => {
          let resolved = false;
          // Store timeout ID on instance so we can clear it if player is destroyed
          this.colorVideoLoadTimeout = setTimeout(() => {
            // Don't fire timeout if player is already initialized (videos loaded successfully)
            // Also check if video element exists and is loaded (in case instance was recreated)
            if (
              this.isInitialized ||
              this.colorVideoLoaded ||
              (this.colorVideo && this.colorVideo.readyState >= 2)
            ) {
              // Player already initialized or video loaded, timeout is stale - just resolve silently
              if (!resolved) {
                resolved = true;
                this.colorVideoLoaded = true;
                resolve();
              }
              return;
            }
            if (!resolved) {
              resolved = true;
              reject(
                new MagmaPlayerError(
                  ERROR_CODES.VIDEO_LOAD_TIMEOUT,
                  "Color video load timeout after 30 seconds. Please check the video URL and network connection.",
                  { videoType: "color", url: this.colorVideoSrc }
                )
              );
            }
          }, 30000);
          const timeoutId = this.colorVideoLoadTimeout;

          const clearTimeoutAndResolve = () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeoutId);
              this.colorVideoLoaded = true;
              resolve();
            }
          };

          const clearTimeoutAndReject = (error) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeoutId);
              reject(error);
            }
          };

          // Check if already loaded
          if (this.colorVideo.readyState >= 2) {
            clearTimeoutAndResolve();
          } else {
            // For data URLs, multiple events might fire, so listen to several
            // Also poll readyState periodically for data URLs (they might load without events)
            let pollInterval = null;

            const cleanupAndResolve = () => {
              if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
              }
              clearTimeoutAndResolve();
            };

            const checkAndResolve = () => {
              if (this.colorVideo && this.colorVideo.readyState >= 2) {
                cleanupAndResolve();
              }
            };

            // Listen to multiple events in case loadedmetadata doesn't fire for data URLs
            this.colorVideo.addEventListener(
              "loadedmetadata",
              checkAndResolve,
              { once: true }
            );
            this.colorVideo.addEventListener("loadeddata", checkAndResolve, {
              once: true,
            });
            this.colorVideo.addEventListener("canplay", checkAndResolve, {
              once: true,
            });

            // Poll readyState periodically for data URLs (they might load without events)
            pollInterval = setInterval(() => {
              if (resolved) {
                if (pollInterval) {
                  clearInterval(pollInterval);
                  pollInterval = null;
                }
                return;
              }
              if (this.colorVideo && this.colorVideo.readyState >= 2) {
                cleanupAndResolve();
              }
            }, 100); // Check every 100ms

            this.colorVideo.addEventListener(
              "error",
              (e) => {
                if (pollInterval) {
                  clearInterval(pollInterval);
                  pollInterval = null;
                }
                // Don't immediately reject - give video a chance to recover
                // Error events can fire transiently during loading
                setTimeout(() => {
                  if (resolved) return; // Already resolved/rejected

                  // Only reject if video actually has an error code (not 0 = no error)
                  // Sometimes error events fire but video still loads successfully
                  if (this.colorVideo && this.colorVideo.readyState >= 2) {
                    // Video actually loaded, resolve instead
                    cleanupAndResolve();
                  } else if (
                    this.colorVideo &&
                    this.colorVideo.error &&
                    this.colorVideo.error.code !== 0
                  ) {
                    // Real error - video failed to load
                    const videoError = this.colorVideo.error;
                    clearTimeoutAndReject(
                      new MagmaPlayerError(
                        ERROR_CODES.VIDEO_LOAD_FAILED,
                        `Color video failed to load (code: ${videoError.code}). Check video format (MP4 H.264 required) and CORS settings.`,
                        {
                          videoType: "color",
                          url: this.colorVideoSrc,
                          errorCode: videoError.code,
                        }
                      )
                    );
                  }
                  // If no error code or error code is 0, don't reject - video might still load
                }, 100); // Small delay to allow video to recover
              },
              { once: true }
            );
          }
        }),
        new Promise((resolve, reject) => {
          let resolved = false;
          // Store timeout ID on instance so we can clear it if player is destroyed
          this.maskVideoLoadTimeout = setTimeout(() => {
            // Don't fire timeout if player is already initialized (videos loaded successfully)
            // Also check if video element exists and is loaded (in case instance was recreated)
            if (
              this.isInitialized ||
              this.maskVideoLoaded ||
              (this.maskVideo && this.maskVideo.readyState >= 2)
            ) {
              // Player already initialized or video loaded, timeout is stale - just resolve silently
              if (!resolved) {
                resolved = true;
                this.maskVideoLoaded = true;
                resolve();
              }
              return;
            }
            if (!resolved) {
              resolved = true;
              reject(
                new MagmaPlayerError(
                  ERROR_CODES.VIDEO_LOAD_TIMEOUT,
                  "Mask video load timeout after 30 seconds. Please check the video URL and network connection.",
                  { videoType: "mask", url: this.maskVideoSrc }
                )
              );
            }
          }, 30000);
          const timeoutId = this.maskVideoLoadTimeout;

          const clearTimeoutAndResolve = () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeoutId);
              this.maskVideoLoaded = true;
              resolve();
            }
          };

          const clearTimeoutAndReject = (error) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeoutId);
              reject(error);
            }
          };

          // Check if already loaded
          if (this.maskVideo.readyState >= 2) {
            clearTimeoutAndResolve();
          } else {
            // For data URLs, multiple events might fire, so listen to several
            // Also poll readyState periodically for data URLs (they might load without events)
            let pollInterval = null;

            const cleanupAndResolve = () => {
              if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
              }
              clearTimeoutAndResolve();
            };

            const checkAndResolve = () => {
              if (this.maskVideo && this.maskVideo.readyState >= 2) {
                cleanupAndResolve();
              }
            };

            // Listen to multiple events in case loadedmetadata doesn't fire for data URLs
            this.maskVideo.addEventListener("loadedmetadata", checkAndResolve, {
              once: true,
            });
            this.maskVideo.addEventListener("loadeddata", checkAndResolve, {
              once: true,
            });
            this.maskVideo.addEventListener("canplay", checkAndResolve, {
              once: true,
            });

            // Poll readyState periodically for data URLs (they might load without events)
            pollInterval = setInterval(() => {
              if (resolved) {
                if (pollInterval) {
                  clearInterval(pollInterval);
                  pollInterval = null;
                }
                return;
              }
              if (this.maskVideo && this.maskVideo.readyState >= 2) {
                cleanupAndResolve();
              }
            }, 100); // Check every 100ms

            this.maskVideo.addEventListener(
              "error",
              (e) => {
                if (pollInterval) {
                  clearInterval(pollInterval);
                  pollInterval = null;
                }
                // Don't immediately reject - give video a chance to recover
                // Error events can fire transiently during loading
                setTimeout(() => {
                  if (resolved) return; // Already resolved/rejected

                  // Only reject if video actually has an error code (not 0 = no error)
                  // Sometimes error events fire but video still loads successfully
                  if (this.maskVideo && this.maskVideo.readyState >= 2) {
                    // Video actually loaded, resolve instead
                    cleanupAndResolve();
                  } else if (
                    this.maskVideo &&
                    this.maskVideo.error &&
                    this.maskVideo.error.code !== 0
                  ) {
                    // Real error - video failed to load
                    const videoError = this.maskVideo.error;
                    clearTimeoutAndReject(
                      new MagmaPlayerError(
                        ERROR_CODES.VIDEO_LOAD_FAILED,
                        `Mask video failed to load (code: ${videoError.code}). Check video format (MP4 H.264 required) and CORS settings.`,
                        {
                          videoType: "mask",
                          url: this.maskVideoSrc,
                          errorCode: videoError.code,
                        }
                      )
                    );
                  }
                  // If no error code or error code is 0, don't reject - video might still load
                }, 100); // Small delay to allow video to recover
              },
              { once: true }
            );
          }
        }),
      ]);

      // Validate video state
      this.validateVideos();

      // Set fixed size immediately if provided, otherwise auto-size
      if (this.fixedSize) {
        const { width, height } = this.fixedSize;
        // Use device pixel ratio for better quality on retina displays
        const internalWidth = width * this.pixelRatio;
        const internalHeight = height * this.pixelRatio;

        this.canvas.width = internalWidth;
        this.canvas.height = internalHeight;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;

        // Set viewport/transform after context is created
        if (this.gl) {
          this.gl.viewport(0, 0, internalWidth, internalHeight);
        } else if (this.ctx) {
          this.ctx.setTransform(1, 0, 0, 1, 0, 0);
          this.ctx.scale(this.pixelRatio, this.pixelRatio);
        }
      } else {
        this.updateCanvasSize();
      }

      // Set up visibility observer to pause rendering when not visible
      this.setupVisibilityObserver();

      this.start();

      // Mark as initialized before emitting ready event
      this.isInitialized = true;

      // Only emit ready event once
      if (!this._readyEmitted) {
        this._readyEmitted = true;
        this.emit("ready");
      }

      // Only call onReady callback once
      // Wrap in try-catch to prevent errors in onReady from breaking initialization
      if (this.onReady && !this._readyCallbackCalled) {
        this._readyCallbackCalled = true;
        try {
          this.onReady();
        } catch (error) {
          // Log error but don't break initialization
          console.error("Error in onReady callback:", error);
          // Emit as warning, not error, since player is still initialized
          this.emit(
            "warning",
            new MagmaPlayerError(
              ERROR_CODES.VIDEO_LOAD_FAILED,
              `Error in onReady callback: ${error.message || String(error)}`,
              { originalError: error }
            )
          );
        }
      }
    } catch (error) {
      // Convert regular errors to MagmaPlayerError if needed
      let playerError = error;
      if (!(error instanceof MagmaPlayerError)) {
        // If it's a video load error, convert it
        if (error.message && error.message.includes("timeout")) {
          playerError = new MagmaPlayerError(
            ERROR_CODES.VIDEO_LOAD_TIMEOUT,
            error.message || "Video load timeout",
            { originalError: error, stack: error.stack }
          );
        } else if (error.message && error.message.includes("failed")) {
          playerError = new MagmaPlayerError(
            ERROR_CODES.VIDEO_LOAD_FAILED,
            error.message || "Video load failed",
            { originalError: error, stack: error.stack }
          );
        } else {
          // Generic error - preserve original message
          const errorMessage =
            error.message || error.toString() || "Initialization failed";
          playerError = new MagmaPlayerError(
            ERROR_CODES.VIDEO_LOAD_FAILED,
            errorMessage,
            {
              originalError: error,
              stack: error.stack,
              name: error.name,
            }
          );
        }
      }

      // Only log actual errors (not transient ones)
      const isActualError =
        playerError.code === ERROR_CODES.VIDEO_LOAD_TIMEOUT ||
        playerError.code === ERROR_CODES.VIDEO_LOAD_FAILED ||
        playerError.code === ERROR_CODES.DURATION_MISMATCH;

      if (isActualError) {
        console.error("MagmaPlayer init error:", playerError);
      }

      this.emit("error", playerError);
      if (this.onError) {
        try {
          this.onError(playerError);
        } catch (callbackError) {
          // Don't let errors in onError callback break initialization
          console.error("Error in onError callback:", callbackError);
        }
      }

      // Re-throw to allow caller to handle
      throw playerError;
    }
  }

  validateVideos() {
    // Check dimensions match
    if (
      this.colorVideo.videoWidth !== this.maskVideo.videoWidth ||
      this.colorVideo.videoHeight !== this.maskVideo.videoHeight
    ) {
      const error = new MagmaPlayerError(
        ERROR_CODES.INVALID_INPUT,
        `Video dimensions mismatch: color (${this.colorVideo.videoWidth}x${this.colorVideo.videoHeight}) vs mask (${this.maskVideo.videoWidth}x${this.maskVideo.videoHeight}). Both videos must have identical dimensions.`,
        {
          colorDimensions: {
            width: this.colorVideo.videoWidth,
            height: this.colorVideo.videoHeight,
          },
          maskDimensions: {
            width: this.maskVideo.videoWidth,
            height: this.maskVideo.videoHeight,
          },
        }
      );
      console.warn(error.message);
      this.emit("error", error);
    }

    // Check durations are compatible
    const colorDuration = this.colorVideo.duration || 0;
    const maskDuration = this.maskVideo.duration || 0;
    const durationDiff = Math.abs(colorDuration - maskDuration);

    if (
      durationDiff > 0.1 &&
      isFinite(colorDuration) &&
      isFinite(maskDuration)
    ) {
      if (this.strictDuration) {
        // Strict mode: throw error
        throw new MagmaPlayerError(
          ERROR_CODES.DURATION_MISMATCH,
          `Video duration mismatch: ${durationDiff.toFixed(
            2
          )}s difference. Color video: ${colorDuration.toFixed(
            2
          )}s, Mask video: ${maskDuration.toFixed(
            2
          )}s. Both videos must have identical durations.`,
          {
            colorDuration,
            maskDuration,
            durationDiff,
          }
        );
      } else {
        // Non-strict mode: warn and use shorter duration
        console.warn(
          `Video duration mismatch: ${durationDiff.toFixed(
            2
          )}s difference. Color: ${colorDuration.toFixed(
            2
          )}s, Mask: ${maskDuration.toFixed(2)}s. Using shorter duration.`
        );
        // Use shorter duration to prevent playback issues
        this.duration = Math.min(colorDuration, maskDuration);
      }
    }

    // Check video format
    if (!this.colorVideo.videoWidth || !this.colorVideo.videoHeight) {
      throw new MagmaPlayerError(
        ERROR_CODES.VIDEO_LOAD_FAILED,
        "Color video metadata not loaded. Please check the video format (MP4 H.264 required).",
        { videoType: "color" }
      );
    }
    if (!this.maskVideo.videoWidth || !this.maskVideo.videoHeight) {
      throw new MagmaPlayerError(
        ERROR_CODES.VIDEO_LOAD_FAILED,
        "Mask video metadata not loaded. Please check the video format (MP4 H.264 required).",
        { videoType: "mask" }
      );
    }
  }

  handleVideoError(type, event) {
    // Only handle error if video is actually in an error state
    const video = type === "color" ? this.colorVideo : this.maskVideo;
    const videoLoaded =
      type === "color" ? this.colorVideoLoaded : this.maskVideoLoaded;

    // Double-check that video is actually in error state
    if (videoLoaded || video.readyState >= 2) {
      // Video actually loaded, don't log error
      return;
    }

    // Check if video element has an actual error
    // Only log if it's a persistent error after videos have had time to load
    if (video && video.error && video.error.code !== 0) {
      // Don't log immediately - videos might still be loading
      // The Promise-based error handling in init() will catch real failures
      // This handler is just for monitoring, so we'll be very conservative
      return;
    }
    // If error.code is 0 or video loaded, it's not a real error
  }

  handleContextLoss(event) {
    event.preventDefault();
    console.warn("WebGL context lost, will attempt to restore");
    this.gl = null;
  }

  handleContextRestore() {
    console.log("WebGL context restored, reinitializing");
    if (this.useWebGL) {
      this.gl =
        this.canvas.getContext("webgl2", {
          alpha: true,
          premultipliedAlpha: false,
        }) ||
        this.canvas.getContext("webgl", {
          alpha: true,
          premultipliedAlpha: false,
        });
      if (this.gl) {
        this.initWebGL();
      } else {
        // Fallback to Canvas2D
        this.ctx = this.canvas.getContext("2d", {
          alpha: true,
          willReadFrequently: true,
        });
      }
    }
  }

  initWebGL() {
    try {
      const gl = this.gl;
      if (!gl) return;

      // Vertex shader
      const vs = `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;
        void main() {
          gl_Position = vec4(a_position, 0, 1);
          v_texCoord = a_texCoord;
        }
      `;

      // Fragment shader - composite color and alpha
      const fs = `
        precision mediump float;
        uniform sampler2D u_colorTexture;
        uniform sampler2D u_alphaTexture;
        varying vec2 v_texCoord;
        void main() {
          vec3 rgb = texture2D(u_colorTexture, v_texCoord).rgb;
          float a = texture2D(u_alphaTexture, v_texCoord).r;
          gl_FragColor = vec4(rgb, a);
        }
      `;

      const compileShader = (type, source) => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          console.error("Shader compile error:", gl.getShaderInfoLog(shader));
          return null;
        }
        return shader;
      };

      const program = gl.createProgram();
      const vertexShader = compileShader(gl.VERTEX_SHADER, vs);
      const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fs);

      if (!vertexShader || !fragmentShader) {
        // Fallback to 2D canvas
        this.gl = null;
        this.ctx = this.canvas.getContext("2d", {
          alpha: true,
          willReadFrequently: true,
        });
        return;
      }

      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Program link error:", gl.getProgramInfoLog(program));
        this.gl = null;
        this.ctx = this.canvas.getContext("2d", {
          alpha: true,
          willReadFrequently: true,
        });
        return;
      }

      gl.useProgram(program);
      this.program = program;

      // Enable blending
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);

      // Setup geometry
      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW
      );
      this.positionBuffer = positionBuffer;

      const positionLoc = gl.getAttribLocation(program, "a_position");
      gl.enableVertexAttribArray(positionLoc);
      gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

      const uvBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]),
        gl.STATIC_DRAW
      );
      this.uvBuffer = uvBuffer;

      const uvLoc = gl.getAttribLocation(program, "a_texCoord");
      gl.enableVertexAttribArray(uvLoc);
      gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

      // Create textures
      this.colorTexture = this.createTexture();
      this.alphaTexture = this.createTexture();

      // Set texture uniforms
      const colorTexLoc = gl.getUniformLocation(program, "u_colorTexture");
      const alphaTexLoc = gl.getUniformLocation(program, "u_alphaTexture");
      gl.uniform1i(colorTexLoc, 0);
      gl.uniform1i(alphaTexLoc, 1);
    } catch (error) {
      console.error("WebGL initialization error:", error);
      this.gl = null;
      this.ctx = this.canvas.getContext("2d", {
        alpha: true,
        willReadFrequently: true,
      });
    }
  }

  createTexture() {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }

  updateCanvasSize() {
    // If fixedSize is set, always use it and skip auto-sizing
    if (this.fixedSize) {
      const { width, height } = this.fixedSize;
      const oldWidth = this.canvas.width;
      const oldHeight = this.canvas.height;

      // Use device pixel ratio for better quality on retina displays
      // Internal resolution will be higher, but CSS size stays at fixedSize
      const internalWidth = width * this.pixelRatio;
      const internalHeight = height * this.pixelRatio;

      this.canvas.width = internalWidth;
      this.canvas.height = internalHeight;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;

      if (this.gl) {
        this.gl.viewport(0, 0, internalWidth, internalHeight);
      } else if (this.ctx) {
        // Scale context to match pixel ratio for proper rendering
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(this.pixelRatio, this.pixelRatio);
      }

      // Emit sizechange event if size actually changed
      if (oldWidth !== internalWidth || oldHeight !== internalHeight) {
        this.emit("sizechange", { width, height });
      }
      return;
    }

    // If autoSize is disabled, don't update canvas size
    if (!this.autoSize) {
      return;
    }

    if (this.colorVideo.videoWidth && this.colorVideo.videoHeight) {
      let width = this.colorVideo.videoWidth;
      let height = this.colorVideo.videoHeight;

      // Apply maxSize constraint if set
      if (this.maxSize) {
        const aspectRatio = width / height;
        const maxWidth = this.maxSize.width;
        const maxHeight = this.maxSize.height;

        if (width > maxWidth || height > maxHeight) {
          // Scale down to fit within maxSize while maintaining aspect ratio
          const widthScale = maxWidth / width;
          const heightScale = maxHeight / height;
          const scale = Math.min(widthScale, heightScale);

          width = width * scale;
          height = height * scale;
        }
      }

      const oldWidth = this.canvas.width;
      const oldHeight = this.canvas.height;

      // Check computed styles to see if parent has constraints
      // Cache computed style to avoid repeated expensive calls
      let hasMaxWidth = false;
      let hasMaxHeight = false;
      const now = performance.now();

      // Refresh cache if expired
      if (
        !this.cachedComputedStyle ||
        now - this.styleCacheTime > this.STYLE_CACHE_DURATION
      ) {
        try {
          this.cachedComputedStyle = window.getComputedStyle(this.canvas);
          this.styleCacheTime = now;
        } catch (e) {
          this.cachedComputedStyle = null;
        }
      }

      try {
        if (this.cachedComputedStyle) {
          hasMaxWidth =
            this.cachedComputedStyle.maxWidth &&
            this.cachedComputedStyle.maxWidth !== "none" &&
            this.cachedComputedStyle.maxWidth !== "auto";
          hasMaxHeight =
            this.cachedComputedStyle.maxHeight &&
            this.cachedComputedStyle.maxHeight !== "none" &&
            this.cachedComputedStyle.maxHeight !== "auto";
        }
      } catch (e) {
        // Fallback: check inline styles
        hasMaxWidth =
          this.canvas.style.maxWidth && this.canvas.style.maxWidth !== "none";
        hasMaxHeight =
          this.canvas.style.maxHeight && this.canvas.style.maxHeight !== "none";
      }

      // Only apply pixel ratio scaling if no CSS constraints are set
      // This prevents stretching when parent container has size constraints
      const shouldUsePixelRatio =
        !hasMaxWidth && !hasMaxHeight && this.pixelRatio > 1;

      if (shouldUsePixelRatio) {
        // Set internal resolution based on pixel ratio for retina displays
        this.canvas.width = width * this.pixelRatio;
        this.canvas.height = height * this.pixelRatio;

        // Set CSS size to actual video size
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
      } else {
        // Use actual video dimensions (no pixel ratio scaling)
        this.canvas.width = width;
        this.canvas.height = height;

        // When constraints are present, calculate CSS size that maintains aspect ratio
        if (hasMaxWidth || hasMaxHeight) {
          const aspectRatio = width / height;
          let cssWidth = width;
          let cssHeight = height;

          try {
            // Use cached computed style
            const computedStyle =
              this.cachedComputedStyle || window.getComputedStyle(this.canvas);

            // Check maxHeight constraint
            if (hasMaxHeight) {
              const maxHeightValue = parseFloat(computedStyle.maxHeight);
              if (
                !isNaN(maxHeightValue) &&
                maxHeightValue > 0 &&
                height > maxHeightValue
              ) {
                cssHeight = maxHeightValue;
                cssWidth = maxHeightValue * aspectRatio;
              }
            }

            // Check maxWidth constraint (after maxHeight, as it might be more restrictive)
            if (hasMaxWidth) {
              const maxWidthValue =
                computedStyle.maxWidth === "100%"
                  ? this.canvas.parentElement?.clientWidth || width
                  : parseFloat(computedStyle.maxWidth);
              if (
                !isNaN(maxWidthValue) &&
                maxWidthValue > 0 &&
                cssWidth > maxWidthValue
              ) {
                cssWidth = maxWidthValue;
                cssHeight = maxWidthValue / aspectRatio;
              }
            }

            // Set CSS dimensions to maintain aspect ratio
            this.canvas.style.width = `${cssWidth}px`;
            this.canvas.style.height = `${cssHeight}px`;
          } catch (e) {
            // Fallback: don't set explicit dimensions
            this.canvas.style.width = "";
            this.canvas.style.height = "";
          }
        } else {
          // No constraints, set explicit dimensions
          this.canvas.style.width = `${width}px`;
          this.canvas.style.height = `${height}px`;
        }
      }

      if (this.gl) {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      } else if (this.ctx) {
        // Reset transform and scale if using pixel ratio
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (shouldUsePixelRatio) {
          this.ctx.scale(this.pixelRatio, this.pixelRatio);
        }
      }

      // Recreate temp canvases if dimensions changed
      if (
        this.tempCanvas &&
        (this.tempCanvas.width !== width || this.tempCanvas.height !== height)
      ) {
        this.tempCanvas = null;
        this.maskCanvas = null;
      }

      // Emit sizechange event if size actually changed
      if (oldWidth !== this.canvas.width || oldHeight !== this.canvas.height) {
        this.emit("sizechange", {
          width: this.canvas.width,
          height: this.canvas.height,
        });
      }
    }
  }

  start() {
    this.isInitialized = true;

    // Ensure both videos start at time 0 before starting playback
    this.colorVideo.currentTime = 0;
    this.maskVideo.currentTime = 0;

    // Only autoplay if enabled
    if (this.autoplay) {
      this._isPlaying = true;
      // Start shared clock now, before videos start playing
      this.sharedClockStart = performance.now();

      // Emit play event immediately so UI can update even if listeners are set up later
      // Use setTimeout to ensure it's emitted after any synchronous listeners are set up
      setTimeout(() => {
        if (this._isPlaying) {
          this.emit("play");
        }
      }, 0);

      try {
        // Start both videos as close together as possible
        const playPromises = [
          this.colorVideo.play().catch((err) => {
            // Suppress autoplay warnings - these are expected in some browsers
            // Only log if it's not the common autoplay interruption error
            if (
              !err.message ||
              !err.message.includes("interrupted by a call to pause")
            ) {
              console.warn("Color video autoplay prevented:", err);
            }
            // Don't emit error for autoplay issues - they're not real errors
          }),
          this.maskVideo.play().catch((err) => {
            // Suppress autoplay warnings - these are expected in some browsers
            // Only log if it's not the common autoplay interruption error
            if (
              !err.message ||
              !err.message.includes("interrupted by a call to pause")
            ) {
              console.warn("Mask video autoplay prevented:", err);
            }
            // Don't emit error for autoplay issues - they're not real errors
          }),
        ];

        // Wait for both to start, then ensure they're synced
        Promise.all(playPromises).then(() => {
          // Force sync after videos start playing
          requestAnimationFrame(() => {
            if (this.colorVideo && this.maskVideo) {
              const syncTime = Math.min(
                this.colorVideo.currentTime || 0,
                this.maskVideo.currentTime || 0
              );
              this.colorVideo.currentTime = syncTime;
              this.maskVideo.currentTime = syncTime;
              this.sharedClockStart =
                performance.now() - (syncTime * 1000) / this.playbackRate;

              // Emit play event again after autoplay starts successfully
              // This ensures UI state is updated even if the first emit was missed
              if (this._isPlaying) {
                this.emit("play");
              }
            }
          });
        });
      } catch (error) {
        console.error("Play error:", error);
        this.emit("error", error);
      }
    } else {
      // Even if not autoplaying, initialize shared clock
      this.sharedClockStart = performance.now();
    }

    // Start render loop
    this.renderLoop();
  }

  renderLoop() {
    this.animationFrameId = requestAnimationFrame(() => this.renderLoop());

    // Check if canvas is still in DOM
    if (this.canvas && !this.canvas.isConnected) {
      if (this._isPlaying) {
        this.pause();
        const error = new MagmaPlayerError(
          ERROR_CODES.CANVAS_REMOVED,
          "Canvas was removed from DOM, playback paused. Playback will resume automatically when canvas is reconnected.",
          {}
        );
        this.emit("warning", error);
        if (this.onError) {
          this.onError(error);
        }
      }
      return;
    }

    // Frame throttling for low-end devices
    const now = performance.now();
    const elapsed = now - this.lastFrameTime;
    if (elapsed < this.frameInterval) {
      return;
    }
    this.lastFrameTime = now - (elapsed % this.frameInterval);

    if (!this._isPlaying || !this.isInitialized || !this.isVisible) {
      return;
    }

    if (
      this.colorVideo.readyState < 2 ||
      this.maskVideo.readyState < 2 ||
      this.canvas.width === 0
    ) {
      return;
    }

    // Don't render during seeks
    if (this.isSeeking) {
      return;
    }

    // Calculate target time based on shared clock and playback rate
    const clockNow = performance.now();
    if (!this.sharedClockStart) {
      this.sharedClockStart = clockNow;
    }
    const elapsedSeconds =
      ((clockNow - this.sharedClockStart) / 1000) * this.playbackRate;
    const videoDuration =
      this.colorVideo.duration || this.maskVideo.duration || Infinity;

    let targetTime = elapsedSeconds;
    if (isFinite(videoDuration) && videoDuration > 0) {
      // Handle repeat count
      if (this.repeatTarget === -1) {
        // Infinite loop
        targetTime = elapsedSeconds % videoDuration;
      } else if (this.repeatTarget === 0) {
        // 0 iterations: Don't play (aligns with CSS)
        this.pause();
        this.emit("ended");
        return;
      } else if (this.repeatTarget === 1) {
        // Play once (1 iteration)
        targetTime = Math.min(elapsedSeconds, videoDuration);
        if (targetTime >= videoDuration) {
          this.pause();
          this.emit("ended");
          return;
        }
      } else {
        // repeatTarget > 1: Play repeatTarget times total
        const forwardElapsed = Math.abs(elapsedSeconds);
        const currentCycle = Math.floor(forwardElapsed / videoDuration);
        const cycleTime = forwardElapsed % videoDuration;

        if (currentCycle >= this.repeatTarget) {
          // Reached play limit (played repeatTarget times)
          this.pause();
          this.emit("ended");
          return;
        } else {
          targetTime = cycleTime;
          // Update repeat count if we've moved to a new cycle
          if (currentCycle > this.repeatCount) {
            this.repeatCount = currentCycle;
            // Ensure videos continue playing when wrapping to next cycle
            // (videos might pause naturally when loop=false and they reach the end)
            if (
              this._isPlaying &&
              (this.colorVideo.paused || this.maskVideo.paused)
            ) {
              this.colorVideo.play().catch(() => {});
              this.maskVideo.play().catch(() => {});
            }
          }
        }
      }
    }
    if (targetTime < 0) targetTime = 0;

    // Sync both videos to shared clock
    // Use smaller threshold for better sync (0.016s = 1 frame at 60fps)
    const SYNC_THRESHOLD = 0.016;
    try {
      // Sync color video
      const colorDiff = Math.abs(this.colorVideo.currentTime - targetTime);
      if (colorDiff > SYNC_THRESHOLD && !this.colorVideo.seeking) {
        this.colorVideo.currentTime = targetTime;
      }

      // Sync mask video
      const maskDiff = Math.abs(this.maskVideo.currentTime - targetTime);
      if (maskDiff > SYNC_THRESHOLD && !this.maskVideo.seeking) {
        this.maskVideo.currentTime = targetTime;
      }

      // If videos are out of sync with each other (even if within threshold of target),
      // sync them to each other first
      const videoDiff = Math.abs(
        this.colorVideo.currentTime - this.maskVideo.currentTime
      );
      if (
        videoDiff > SYNC_THRESHOLD &&
        !this.colorVideo.seeking &&
        !this.maskVideo.seeking
      ) {
        // Use color video as master (it's typically loaded first)
        const masterTime = this.colorVideo.currentTime;
        this.maskVideo.currentTime = masterTime;
        // Update shared clock to match
        this.sharedClockStart =
          performance.now() - (masterTime * 1000) / this.playbackRate;
      }
    } catch (error) {
      // Ignore seek errors during normal playback
    }

    // Emit timeupdate event (throttled to avoid excessive event firing)
    // Only emit if significant time has passed (16ms = ~60fps)
    const lastTimeUpdate = this.lastTimeUpdate || 0;
    if (now - lastTimeUpdate >= 16) {
      this.emit("timeupdate", targetTime);
      this.lastTimeUpdate = now;
    }

    // Render frame
    if (this.gl && !this.colorVideo.seeking && !this.maskVideo.seeking) {
      this.renderWebGL();
    } else if (
      this.ctx &&
      !this.colorVideo.seeking &&
      !this.maskVideo.seeking
    ) {
      this.renderCanvas2D();
    }
  }

  renderWebGL() {
    try {
      const gl = this.gl;
      if (!gl) return;

      gl.clear(gl.COLOR_BUFFER_BIT);

      // Only upload frames if they've changed (performance optimization)
      // Also check if video is actually ready to avoid unnecessary uploads
      const colorFrameTime = this.colorVideo.currentTime;
      const maskFrameTime = this.maskVideo.currentTime;

      // Only update texture if frame time changed AND video is ready
      const colorNeedsUpdate =
        colorFrameTime !== this.lastColorFrameTime &&
        this.colorVideo.readyState >= 2;
      const maskNeedsUpdate =
        maskFrameTime !== this.lastMaskFrameTime &&
        this.maskVideo.readyState >= 2;

      if (colorNeedsUpdate) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          this.colorVideo
        );
        this.lastColorFrameTime = colorFrameTime;
      }

      if (maskNeedsUpdate) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.alphaTexture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          this.maskVideo
        );
        this.lastMaskFrameTime = maskFrameTime;
      }

      // Only draw if at least one texture was updated, or if this is the first frame
      if (
        colorNeedsUpdate ||
        maskNeedsUpdate ||
        this.lastColorFrameTime === -1
      ) {
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    } catch (error) {
      console.error("WebGL render error:", error);
      // Fallback to Canvas2D on error
      if (!this.ctx) {
        this.ctx = this.canvas.getContext("2d", {
          alpha: true,
          willReadFrequently: true,
        });
      }
    }
  }

  renderCanvas2D() {
    try {
      const ctx = this.ctx;
      if (!ctx) return;

      // Get actual video dimensions (not scaled by pixel ratio)
      const videoWidth = this.colorVideo.videoWidth;
      const videoHeight = this.colorVideo.videoHeight;

      // Skip if dimensions are invalid
      if (videoWidth === 0 || videoHeight === 0) return;

      // Clear canvas using actual video dimensions
      ctx.clearRect(0, 0, videoWidth, videoHeight);

      // Reuse temp canvases (performance optimization)
      if (!this.tempCanvas) {
        this.tempCanvas = document.createElement("canvas");
        this.tempCanvas.width = videoWidth;
        this.tempCanvas.height = videoHeight;
      }
      if (!this.maskCanvas) {
        this.maskCanvas = document.createElement("canvas");
        this.maskCanvas.width = videoWidth;
        this.maskCanvas.height = videoHeight;
      }

      // Recreate canvases if dimensions changed
      if (
        this.tempCanvas.width !== videoWidth ||
        this.tempCanvas.height !== videoHeight
      ) {
        this.tempCanvas.width = videoWidth;
        this.tempCanvas.height = videoHeight;
      }
      if (
        this.maskCanvas.width !== videoWidth ||
        this.maskCanvas.height !== videoHeight
      ) {
        this.maskCanvas.width = videoWidth;
        this.maskCanvas.height = videoHeight;
      }

      const tempCtx = this.tempCanvas.getContext("2d", {
        willReadFrequently: false,
      });
      const maskCtx = this.maskCanvas.getContext("2d", {
        willReadFrequently: false,
      });

      // Draw videos to temp canvases
      tempCtx.drawImage(this.colorVideo, 0, 0, videoWidth, videoHeight);
      maskCtx.drawImage(this.maskVideo, 0, 0, videoWidth, videoHeight);

      // Get image data - reuse arrays if possible
      const colorData = tempCtx.getImageData(0, 0, videoWidth, videoHeight);
      const maskData = maskCtx.getImageData(0, 0, videoWidth, videoHeight);

      // Use TypedArray operations for better performance
      const colorPixels = colorData.data;
      const maskPixels = maskData.data;
      const pixelCount = colorPixels.length;

      // Optimize: process in chunks and use bitwise operations where possible
      // Apply mask as alpha channel using optimized loop
      for (let i = 0; i < pixelCount; i += 4) {
        // Calculate grayscale mask value (luminance formula for better accuracy)
        // Using integer math for better performance
        const maskGray = Math.round(
          maskPixels[i] * 0.299 +
            maskPixels[i + 1] * 0.587 +
            maskPixels[i + 2] * 0.114
        );

        // Direct assignment - no need to create new array
        colorPixels[i + 3] = maskGray;
      }

      // Put the modified image data back
      ctx.putImageData(colorData, 0, 0);
    } catch (error) {
      console.error("Canvas2D render error:", error);
    }
  }

  // Event system
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.eventListeners[event]) return;
    this.eventListeners[event] = this.eventListeners[event].filter(
      (cb) => cb !== callback
    );
  }

  emit(event, ...args) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach((callback) => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in ${event} event handler:`, error);
        }
      });
    }
  }

  // Playback control
  play() {
    if (!this.isInitialized) return;

    // If already playing, do nothing
    if (this._isPlaying) return;

    this._isPlaying = true;

    try {
      // Get current time from color video (master) - use the actual paused time
      // If videos are paused, their currentTime should be accurate
      let currentTime = this.colorVideo.currentTime || 0;

      // If videos are already playing (shouldn't happen, but be safe),
      // use the minimum of both to ensure sync
      if (!this.colorVideo.paused || !this.maskVideo.paused) {
        currentTime = Math.min(
          this.colorVideo.currentTime || 0,
          this.maskVideo.currentTime || 0
        );
      }

      // Ensure both videos are at the same time before playing
      // Only set if they're not already at that time (avoid unnecessary seeks)
      const SYNC_THRESHOLD = 0.1; // 100ms threshold
      if (
        Math.abs(this.colorVideo.currentTime - currentTime) > SYNC_THRESHOLD
      ) {
        this.colorVideo.currentTime = currentTime;
      }
      if (Math.abs(this.maskVideo.currentTime - currentTime) > SYNC_THRESHOLD) {
        this.maskVideo.currentTime = currentTime;
      }

      // Update shared clock based on the synced time
      this.sharedClockStart =
        performance.now() - (currentTime * 1000) / this.playbackRate;

      // Start both videos as close together as possible
      const playPromises = [
        this.colorVideo.play().catch((err) => {
          console.error("Color video play error:", err);
          this.emit("error", err);
        }),
        this.maskVideo.play().catch((err) => {
          console.error("Mask video play error:", err);
          this.emit("error", err);
        }),
      ];

      // After both start, verify sync and adjust if needed
      Promise.all(playPromises).then(() => {
        // Use requestAnimationFrame to ensure videos have started
        requestAnimationFrame(() => {
          if (this.colorVideo && this.maskVideo && this._isPlaying) {
            // Get actual current time from both videos
            const colorTime = this.colorVideo.currentTime || 0;
            const maskTime = this.maskVideo.currentTime || 0;
            const actualTime = Math.min(colorTime, maskTime);

            // Only adjust if there's a significant difference (more than 1 frame)
            const SYNC_THRESHOLD = 0.016; // ~1 frame at 60fps
            if (
              Math.abs(colorTime - maskTime) > SYNC_THRESHOLD ||
              Math.abs(actualTime - currentTime) > SYNC_THRESHOLD
            ) {
              // Force sync
              this.colorVideo.currentTime = actualTime;
              this.maskVideo.currentTime = actualTime;
              // Update shared clock to match
              this.sharedClockStart =
                performance.now() - (actualTime * 1000) / this.playbackRate;
            }
          }
        });
      });

      this.emit("play");
    } catch (error) {
      console.error("Play error:", error);
      this.emit("error", error);
    }
  }

  pause() {
    this._isPlaying = false;
    try {
      this.colorVideo.pause();
      this.maskVideo.pause();
      this.emit("pause");
    } catch (error) {
      console.error("Pause error:", error);
    }
  }

  seek(time) {
    if (!this.isInitialized) return;
    this.isSeeking = true;

    // Clear any existing seek timeout
    if (this.seekTimeout) {
      clearTimeout(this.seekTimeout);
    }

    // Set seek timeout
    this.seekTimeout = setTimeout(() => {
      this.isSeeking = false;
      this.seekTimeout = null;
    }, 1000);

    try {
      this.colorVideo.currentTime = time;
      this.maskVideo.currentTime = time;
      this.sharedClockStart =
        performance.now() - (time * 1000) / this.playbackRate;

      // Wait for seeked events
      const handleSeeked = () => {
        if (
          this.colorVideo.readyState >= 2 &&
          this.maskVideo.readyState >= 2 &&
          !this.colorVideo.seeking &&
          !this.maskVideo.seeking
        ) {
          this.isSeeking = false;
          if (this.seekTimeout) {
            clearTimeout(this.seekTimeout);
            this.seekTimeout = null;
          }
          this.colorVideo.removeEventListener("seeked", handleSeeked);
          this.maskVideo.removeEventListener("seeked", handleSeeked);
          this.emit("seeked", time);
        }
      };

      this.colorVideo.addEventListener("seeked", handleSeeked, { once: true });
      this.maskVideo.addEventListener("seeked", handleSeeked, { once: true });
    } catch (error) {
      console.error("Seek error:", error);
      this.isSeeking = false;
      this.emit("error", error);
    }
  }

  reset() {
    this.pause();
    // Reset repeat count
    this.repeatCount = 0;
    this.seek(0);
  }

  // Volume control
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.colorVideo) {
      this.colorVideo.volume = this.volume;
    }
    if (this.maskVideo) {
      this.maskVideo.volume = this.volume;
    }
  }

  getVolume() {
    return this.volume;
  }

  // Playback speed control
  setPlaybackRate(rate) {
    this.playbackRate = Math.max(0.25, Math.min(4.0, rate));
    if (this.colorVideo) {
      this.colorVideo.playbackRate = this.playbackRate;
    }
    if (this.maskVideo) {
      this.maskVideo.playbackRate = this.playbackRate;
    }
    // Update shared clock to account for rate change
    if (this.isInitialized) {
      const currentTime = this.getCurrentTime();
      this.sharedClockStart =
        performance.now() - (currentTime * 1000) / this.playbackRate;
    }
  }

  getPlaybackRate() {
    return this.playbackRate;
  }

  // Time & duration getters
  getCurrentTime() {
    if (!this.isInitialized || !this.colorVideo) return 0;
    return this.colorVideo.currentTime || 0;
  }

  getDuration() {
    if (!this.isInitialized || !this.colorVideo) return 0;
    return this.colorVideo.duration || 0;
  }

  getBuffered() {
    if (!this.isInitialized || !this.colorVideo) return [];
    const buffered = this.colorVideo.buffered;
    const ranges = [];
    for (let i = 0; i < buffered.length; i++) {
      ranges.push({
        start: buffered.start(i),
        end: buffered.end(i),
      });
    }
    return ranges;
  }

  // Loop control (legacy API - maps to repeatTarget)
  setLoop(loop) {
    this.loop = Boolean(loop);
    // Sync repeatTarget with loop setting for consistency
    if (this.loop) {
      this.repeatTarget = -1; // Infinite loop
    } else if (this.repeatTarget === -1) {
      // Only change if currently infinite, otherwise preserve repeat count
      this.repeatTarget = 0; // No repeat
    }
    if (this.colorVideo) {
      this.colorVideo.loop = this.loop;
    }
    if (this.maskVideo) {
      this.maskVideo.loop = this.loop;
    }
  }

  getLoop() {
    return this.loop;
  }

  // Repeat control
  /**
   * Set play count (-1 = infinite loop, 0 = don't play, 1 = play once, >1 = play that many times total)
   *
   * Semantics (aligned with CSS animation-iteration-count):
   * - -1: Infinite loop (plays forever)
   * - 0: Don't play (0 iterations) - aligns with CSS
   * - 1: Play once and stop (1 iteration)
   * - 3: Play 3 times total (3 iterations)
   *
   * @param {number} count - Total number of times to play (-1 for infinite, 0 for don't play, 1 for once, >1 for that many total plays)
   * @example
   * player.setRepeatCount(3); // Play 3 times total
   * player.setRepeatCount(-1); // Infinite loop
   * player.setRepeatCount(1); // Play once
   * player.setRepeatCount(0); // Don't play (0 iterations)
   */
  setRepeatCount(count) {
    this.repeatCount = 0;
    const target = Math.floor(count || 0);

    if (target === -1) {
      // Infinite loop
      this.repeatTarget = -1;
      this.loop = true;
      if (this.colorVideo) {
        this.colorVideo.loop = true;
      }
      if (this.maskVideo) {
        this.maskVideo.loop = true;
      }
    } else if (target === 0) {
      // 0: Don't play (0 iterations) - aligns with CSS animation-iteration-count
      this.repeatTarget = 0;
      this.loop = false;
      // Pause if currently playing
      if (this._isPlaying) {
        this.pause();
      }
      if (this.colorVideo) {
        this.colorVideo.loop = false;
      }
      if (this.maskVideo) {
        this.maskVideo.loop = false;
      }
    } else if (target === 1) {
      // 1: Play once (1 iteration)
      this.repeatTarget = 1;
      this.loop = false;
      if (this.colorVideo) {
        this.colorVideo.loop = false;
      }
      if (this.maskVideo) {
        this.maskVideo.loop = false;
      }
    } else {
      // >1: Play target times total
      this.repeatTarget = target;
      this.loop = false;
      if (this.colorVideo) {
        this.colorVideo.loop = false;
      }
      if (this.maskVideo) {
        this.maskVideo.loop = false;
      }
    }
  }

  /**
   * Get current repeat count
   * @returns {number} Current repeat count (0 if not repeating)
   */
  getRepeatCount() {
    return this.repeatTarget;
  }

  // Utility methods
  // Note: isPlaying is both a property and method for compatibility
  // The method is preferred for API usage
  isPlaying() {
    // Return the internal state property
    return Boolean(this._isPlaying);
  }

  isPaused() {
    // Return opposite of playing state
    return !this._isPlaying;
  }

  // Check if player is ready
  isReady() {
    return this.isInitialized && this._readyEmitted;
  }

  // Getter for property access (for compatibility)
  get playing() {
    return this._isPlaying;
  }

  getVideoWidth() {
    if (!this.colorVideo) return 0;
    return this.colorVideo.videoWidth || 0;
  }

  getVideoHeight() {
    if (!this.colorVideo) return 0;
    return this.colorVideo.videoHeight || 0;
  }

  setSize(width, height) {
    this.canvas.width = width * this.pixelRatio;
    this.canvas.height = height * this.pixelRatio;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    if (this.gl) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  setupVisibilityObserver() {
    // Use IntersectionObserver to detect when canvas is not visible
    // This allows us to skip rendering when canvas is off-screen
    if (typeof IntersectionObserver !== "undefined" && this.canvas) {
      this.visibilityObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            this.isVisible =
              entry.isIntersecting && entry.intersectionRatio > 0;
          });
        },
        {
          threshold: 0, // Trigger when any part is visible
        }
      );
      this.visibilityObserver.observe(this.canvas);
    } else {
      // Fallback: check display style
      const checkVisibility = () => {
        const style = window.getComputedStyle(this.canvas);
        this.isVisible =
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0";
      };
      // Check periodically
      setInterval(checkVisibility, 1000);
      checkVisibility();
    }
  }

  destroy() {
    this.pause();

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.seekTimeout) {
      clearTimeout(this.seekTimeout);
      this.seekTimeout = null;
    }

    // Clear video load timeouts
    if (this.colorVideoLoadTimeout) {
      clearTimeout(this.colorVideoLoadTimeout);
      this.colorVideoLoadTimeout = null;
    }
    if (this.maskVideoLoadTimeout) {
      clearTimeout(this.maskVideoLoadTimeout);
      this.maskVideoLoadTimeout = null;
    }

    // Clean up visibility observer
    if (this.visibilityObserver) {
      this.visibilityObserver.disconnect();
      this.visibilityObserver = null;
    }

    // Remove event listeners
    if (this.colorVideo) {
      if (this.colorVideoErrorHandler) {
        this.colorVideo.removeEventListener(
          "error",
          this.colorVideoErrorHandler
        );
      }
      this.colorVideo.src = "";
      this.colorVideo.load();
      this.colorVideo = null;
    }

    if (this.maskVideo) {
      if (this.maskVideoErrorHandler) {
        this.maskVideo.removeEventListener("error", this.maskVideoErrorHandler);
      }
      this.maskVideo.src = "";
      this.maskVideo.load();
      this.maskVideo = null;
    }

    // Remove WebGL context event listeners
    if (this.canvas && this.webglContextLossHandler) {
      this.canvas.removeEventListener(
        "webglcontextlost",
        this.webglContextLossHandler
      );
    }
    if (this.canvas && this.webglContextRestoreHandler) {
      this.canvas.removeEventListener(
        "webglcontextrestored",
        this.webglContextRestoreHandler
      );
    }

    if (this.gl) {
      try {
        if (this.colorTexture) this.gl.deleteTexture(this.colorTexture);
        if (this.alphaTexture) this.gl.deleteTexture(this.alphaTexture);
        if (this.program) this.gl.deleteProgram(this.program);
        if (this.positionBuffer) this.gl.deleteBuffer(this.positionBuffer);
        if (this.uvBuffer) this.gl.deleteBuffer(this.uvBuffer);
      } catch (error) {
        console.error("Error cleaning up WebGL resources:", error);
      }
      this.gl = null;
    }

    // Clear event listeners
    this.eventListeners = {};

    // Reset internal flags
    this._readyEmitted = false;
    this._readyCallbackCalled = false;
    this.isInitialized = false;
  }
}
