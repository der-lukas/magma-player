import {
  Component,
  effect,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
  viewChild,
} from "@angular/core";
import { ElementRef } from "@angular/core";

import {
  MagmaPlayer,
  MagmaPlayerError,
  ERROR_CODES,
  type MagmaPlayerOptions,
} from "../MagmaPlayer.js";

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
@Component({
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
})
export class MagmaPlayerComponent implements OnInit, OnDestroy {
  private readonly _canvasRef =
    viewChild<ElementRef<HTMLCanvasElement>>("canvas");

  // Required inputs
  readonly colorVideoSrc = input.required<string>();
  readonly maskVideoSrc = input.required<string>();

  // Optional inputs
  readonly fixedSize = input<{ width: number; height: number }>();
  readonly maxSize = input<{ width: number; height: number }>();
  readonly autoplay = input<boolean>(true);
  readonly useWebGL = input<boolean>(true);
  readonly targetFPS = input<number>(60);
  readonly autoSize = input<boolean>(true);
  readonly strictDuration = input<boolean>(false);
  readonly repeatCount = input<number>();

  // Outputs
  readonly ready = output<MagmaPlayer>();
  readonly error = output<MagmaPlayerError>();
  readonly play = output<void>();
  readonly pause = output<void>();
  readonly timeupdate = output<number>();
  readonly ended = output<void>();
  readonly seeked = output<number>();
  readonly warning = output<MagmaPlayerError>();
  readonly sizechange = output<{ width: number; height: number }>();

  // Reactive state signals
  readonly isPlaying = signal(false);
  readonly isReady = signal(false);
  readonly isPaused = signal(true);
  readonly currentTime = signal(0);
  readonly duration = signal(0);
  readonly videoWidth = signal(0);
  readonly videoHeight = signal(0);
  readonly volume = signal(1);
  readonly playbackRate = signal(1);
  readonly loop = signal(true);

  private _player: MagmaPlayer | null = null;
  private _timeUpdateThrottle: ReturnType<typeof setInterval> | null = null;
  private _stateUpdateInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
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

  ngOnInit(): void {
    const canvasRef = this._canvasRef();
    const canvas = canvasRef?.nativeElement;
    if (canvas && canvas.isConnected && !this._player) {
      this._initializePlayer();
    }
  }

  ngOnDestroy(): void {
    this._cleanup();
  }

  private _initializePlayer(): void {
    const canvasRef = this._canvasRef();
    const canvas = canvasRef?.nativeElement;

    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      return;
    }

    try {
      const options: MagmaPlayerOptions = {
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
        } else {
          if (this._stateUpdateInterval) {
            clearInterval(this._stateUpdateInterval);
            this._stateUpdateInterval = null;
          }
        }
      }, 500);
    } catch (error) {
      const playerError =
        error instanceof MagmaPlayerError
          ? error
          : new MagmaPlayerError(
              ERROR_CODES.INVALID_INPUT,
              `Failed to initialize MagmaPlayer: ${
                error instanceof Error ? error.message : String(error)
              }`,
              { originalError: error }
            );
      this.error.emit(playerError);
    }
  }

  private _updateStateSignals(): void {
    if (!this._player) return;

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
    } catch (error) {
      // Ignore errors when player is not fully initialized
    }
  }

  private _cleanup(): void {
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
  startPlayback(): void {
    this._player?.play();
  }

  /**
   * Pause playback
   */
  pausePlayback(): void {
    this._player?.pause();
  }

  /**
   * Seek to specific time (in seconds)
   */
  seek(time: number): void {
    this._player?.seek(time);
  }

  /**
   * Reset to time 0 and pause
   */
  reset(): void {
    this._player?.reset();
  }

  /**
   * Set volume (0-1 range)
   */
  setVolume(volume: number): void {
    this._player?.setVolume(volume);
  }

  /**
   * Set playback speed (0.25-4.0 range)
   */
  setPlaybackRate(rate: number): void {
    this._player?.setPlaybackRate(rate);
  }

  /**
   * Enable/disable looping
   */
  setLoop(loop: boolean): void {
    this._player?.setLoop(loop);
  }

  /**
   * Set repeat count (-1 = infinite, 0 = don't play, 1 = once, >1 = total plays)
   * @param count - Total number of times to play
   */
  setRepeatCount(count: number): void {
    this._player?.setRepeatCount(count);
  }

  /**
   * Get current repeat count
   * @returns Current repeat count (0 if not repeating)
   */
  getRepeatCount(): number {
    return this._player?.getRepeatCount() || 0;
  }

  /**
   * Get the underlying MagmaPlayer instance
   */
  getPlayer(): MagmaPlayer | null {
    return this._player;
  }
}
