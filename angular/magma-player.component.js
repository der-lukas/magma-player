var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
import { Component, effect, input, output, signal, viewChild, } from "@angular/core";
import { MagmaPlayer, MagmaPlayerError, ERROR_CODES, } from "../MagmaPlayer.js";
/**
 * Angular component for MagmaPlayer integration.
 * Handles automatic lifecycle management and provides reactive signals.
 *
 * @example
 * ```html
 * <magma-player
 *   [colorVideoSrc]="'assets/videos/color.mp4'"
 *   [maskVideoSrc]="'assets/videos/mask.mp4'"
 *   [fixedSize]="{ width: 180, height: 180 }"
 *   [autoplay]="true"
 *   (ready)="onPlayerReady($event)"
 *   (error)="onPlayerError($event)"
 * />
 * ```
 */
let MagmaPlayerComponent = (() => {
    let _classDecorators = [Component({
            selector: "magma-player",
            standalone: true,
            template: `<canvas #canvas></canvas>`,
            styles: [
                `
      :host {
        display: block;
      }
      canvas {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
            ],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MagmaPlayerComponent = _classThis = class {
        constructor() {
            this._canvasRef = viewChild("canvas");
            // Required inputs
            this.colorVideoSrc = input.required();
            this.maskVideoSrc = input.required();
            // Optional inputs
            this.fixedSize = input();
            this.maxSize = input();
            this.autoplay = input(true);
            this.useWebGL = input(true);
            this.targetFPS = input(60);
            this.autoSize = input(true);
            this.strictDuration = input(false);
            this.repeatCount = input();
            // Outputs
            this.ready = output();
            this.error = output();
            this.play = output();
            this.pause = output();
            this.timeupdate = output();
            this.ended = output();
            this.seeked = output();
            this.warning = output();
            this.sizechange = output();
            // Reactive state signals
            this.isPlaying = signal(false);
            this.isReady = signal(false);
            this.isPaused = signal(true);
            this.currentTime = signal(0);
            this.duration = signal(0);
            this.videoWidth = signal(0);
            this.videoHeight = signal(0);
            this.volume = signal(1);
            this.playbackRate = signal(1);
            this.loop = signal(true);
            this._player = null;
            this._timeUpdateThrottle = null;
            this._stateUpdateInterval = null;
            // React to input changes and reinitialize if needed
            effect(() => {
                const colorSrc = this.colorVideoSrc();
                const maskSrc = this.maskVideoSrc();
                const canvasRef = this._canvasRef();
                const canvas = canvasRef?.nativeElement;
                // Only initialize if canvas is available and player doesn't exist
                if (canvas && !this._player && colorSrc && maskSrc) {
                    // Use requestAnimationFrame to ensure canvas is in DOM
                    requestAnimationFrame(() => {
                        if (!this._player && canvas.isConnected) {
                            this._initializePlayer();
                        }
                    });
                }
            });
            // React to repeat count changes
            effect(() => {
                const repeatCount = this.repeatCount();
                if (this._player && repeatCount !== undefined) {
                    this._player.setRepeatCount(repeatCount);
                }
            });
        }
        ngOnInit() {
            const canvasRef = this._canvasRef();
            const canvas = canvasRef?.nativeElement;
            if (canvas && canvas.isConnected && !this._player) {
                this._initializePlayer();
            }
        }
        ngOnDestroy() {
            this._cleanup();
        }
        _initializePlayer() {
            const canvasRef = this._canvasRef();
            const canvas = canvasRef?.nativeElement;
            if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
                return;
            }
            try {
                const options = {
                    colorVideoSrc: this.colorVideoSrc(),
                    maskVideoSrc: this.maskVideoSrc(),
                    canvas,
                    fixedSize: this.fixedSize(),
                    maxSize: this.maxSize(),
                    autoplay: this.autoplay(),
                    useWebGL: this.useWebGL(),
                    targetFPS: this.targetFPS(),
                    autoSize: this.autoSize(),
                    strictDuration: this.strictDuration(),
                    onReady: () => {
                        this.isReady.set(true);
                        if (this._player) {
                            this._updateStateSignals();
                            this.ready.emit(this._player);
                        }
                    },
                    onError: (error) => {
                        this.error.emit(error);
                    },
                };
                this._player = new MagmaPlayer(options);
                // Set up event listeners
                this._player.on("play", () => {
                    this.isPlaying.set(true);
                    this.isPaused.set(false);
                    this.play.emit();
                });
                this._player.on("pause", () => {
                    this.isPlaying.set(false);
                    this.isPaused.set(true);
                    this.pause.emit();
                });
                this._player.on("timeupdate", (time) => {
                    this.currentTime.set(time);
                    // Throttle timeupdate emissions to avoid excessive output events
                    if (!this._timeUpdateThrottle) {
                        this.timeupdate.emit(time);
                        this._timeUpdateThrottle = setTimeout(() => {
                            this._timeUpdateThrottle = null;
                        }, 100); // Emit max once per 100ms
                    }
                });
                this._player.on("ended", () => {
                    this.isPlaying.set(false);
                    this.isPaused.set(true);
                    this.ended.emit();
                });
                this._player.on("seeked", (time) => {
                    this.currentTime.set(time);
                    this.seeked.emit(time);
                });
                this._player.on("warning", (warning) => {
                    this.warning.emit(warning);
                });
                this._player.on("sizechange", (size) => {
                    this.sizechange.emit(size);
                });
                // Apply repeat count if provided
                const repeatCount = this.repeatCount();
                if (repeatCount !== undefined) {
                    this._player.setRepeatCount(repeatCount);
                }
                // Periodically update state signals
                this._stateUpdateInterval = setInterval(() => {
                    if (this._player && this._player.isReady()) {
                        this._updateStateSignals();
                    }
                    else {
                        if (this._stateUpdateInterval) {
                            clearInterval(this._stateUpdateInterval);
                            this._stateUpdateInterval = null;
                        }
                    }
                }, 500);
            }
            catch (error) {
                const playerError = error instanceof MagmaPlayerError
                    ? error
                    : new MagmaPlayerError(ERROR_CODES.INVALID_INPUT, `Failed to initialize MagmaPlayer: ${error instanceof Error ? error.message : String(error)}`, { originalError: error });
                this.error.emit(playerError);
            }
        }
        _updateStateSignals() {
            if (!this._player)
                return;
            try {
                this.isPlaying.set(this._player.isPlaying());
                this.isPaused.set(this._player.isPaused());
                this.currentTime.set(this._player.getCurrentTime());
                this.duration.set(this._player.getDuration());
                this.videoWidth.set(this._player.getVideoWidth());
                this.videoHeight.set(this._player.getVideoHeight());
                this.volume.set(this._player.getVolume());
                this.playbackRate.set(this._player.getPlaybackRate());
                this.loop.set(this._player.getLoop());
            }
            catch (error) {
                // Ignore errors when player is not fully initialized
            }
        }
        _cleanup() {
            if (this._timeUpdateThrottle) {
                clearTimeout(this._timeUpdateThrottle);
                this._timeUpdateThrottle = null;
            }
            if (this._stateUpdateInterval) {
                clearInterval(this._stateUpdateInterval);
                this._stateUpdateInterval = null;
            }
            if (this._player) {
                this._player.destroy();
                this._player = null;
            }
            // Reset all signals
            this.isPlaying.set(false);
            this.isReady.set(false);
            this.isPaused.set(true);
            this.currentTime.set(0);
            this.duration.set(0);
            this.videoWidth.set(0);
            this.videoHeight.set(0);
        }
        // Expose player methods for programmatic control
        /**
         * Start playback
         */
        startPlayback() {
            this._player?.play();
        }
        /**
         * Pause playback
         */
        pausePlayback() {
            this._player?.pause();
        }
        /**
         * Seek to specific time (in seconds)
         */
        seek(time) {
            this._player?.seek(time);
        }
        /**
         * Reset to time 0 and pause
         */
        reset() {
            this._player?.reset();
        }
        /**
         * Set volume (0-1 range)
         */
        setVolume(volume) {
            this._player?.setVolume(volume);
        }
        /**
         * Set playback speed (0.25-4.0 range)
         */
        setPlaybackRate(rate) {
            this._player?.setPlaybackRate(rate);
        }
        /**
         * Enable/disable looping
         */
        setLoop(loop) {
            this._player?.setLoop(loop);
        }
        /**
         * Set repeat count (-1 = infinite, 0 = don't play, 1 = once, >1 = total plays)
         * @param count - Total number of times to play
         */
        setRepeatCount(count) {
            this._player?.setRepeatCount(count);
        }
        /**
         * Get current repeat count
         * @returns Current repeat count (0 if not repeating)
         */
        getRepeatCount() {
            return this._player?.getRepeatCount() || 0;
        }
        /**
         * Get the underlying MagmaPlayer instance
         */
        getPlayer() {
            return this._player;
        }
    };
    __setFunctionName(_classThis, "MagmaPlayerComponent");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        MagmaPlayerComponent = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return MagmaPlayerComponent = _classThis;
})();
export { MagmaPlayerComponent };
