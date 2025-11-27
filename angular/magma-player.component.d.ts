import { OnDestroy, OnInit } from "@angular/core";
import { MagmaPlayer } from "../MagmaPlayer.js";
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
export declare class MagmaPlayerComponent implements OnInit, OnDestroy {
    private readonly _canvasRef;
    readonly colorVideoSrc: any;
    readonly maskVideoSrc: any;
    readonly fixedSize: any;
    readonly maxSize: any;
    readonly autoplay: any;
    readonly useWebGL: any;
    readonly targetFPS: any;
    readonly autoSize: any;
    readonly strictDuration: any;
    readonly repeatCount: any;
    readonly ready: any;
    readonly error: any;
    readonly play: any;
    readonly pause: any;
    readonly timeupdate: any;
    readonly ended: any;
    readonly seeked: any;
    readonly warning: any;
    readonly sizechange: any;
    readonly isPlaying: any;
    readonly isReady: any;
    readonly isPaused: any;
    readonly currentTime: any;
    readonly duration: any;
    readonly videoWidth: any;
    readonly videoHeight: any;
    readonly volume: any;
    readonly playbackRate: any;
    readonly loop: any;
    private _player;
    private _timeUpdateThrottle;
    private _stateUpdateInterval;
    constructor();
    ngOnInit(): void;
    ngOnDestroy(): void;
    private _initializePlayer;
    private _updateStateSignals;
    private _cleanup;
    /**
     * Start playback
     */
    startPlayback(): void;
    /**
     * Pause playback
     */
    pausePlayback(): void;
    /**
     * Seek to specific time (in seconds)
     */
    seek(time: number): void;
    /**
     * Reset to time 0 and pause
     */
    reset(): void;
    /**
     * Set volume (0-1 range)
     */
    setVolume(volume: number): void;
    /**
     * Set playback speed (0.25-4.0 range)
     */
    setPlaybackRate(rate: number): void;
    /**
     * Enable/disable looping
     */
    setLoop(loop: boolean): void;
    /**
     * Set repeat count (-1 = infinite, 0 = don't play, 1 = once, >1 = total plays)
     * @param count - Total number of times to play
     */
    setRepeatCount(count: number): void;
    /**
     * Get current repeat count
     * @returns Current repeat count (0 if not repeating)
     */
    getRepeatCount(): number;
    /**
     * Get the underlying MagmaPlayer instance
     */
    getPlayer(): MagmaPlayer | null;
}
