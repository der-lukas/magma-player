import { OnDestroy, OnInit } from "@angular/core";
import { MagmaPlayer, MagmaPlayerError } from "../MagmaPlayer.js";
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
    readonly colorVideoSrc: () => string;
    readonly maskVideoSrc: () => string;
    readonly fixedSize: () => {
        width: number;
        height: number;
    };
    readonly maxSize: () => {
        width: number;
        height: number;
    };
    readonly autoplay: () => boolean;
    readonly useWebGL: () => boolean;
    readonly targetFPS: () => number;
    readonly autoSize: () => boolean;
    readonly strictDuration: () => boolean;
    readonly repeatCount: () => number;
    readonly ready: {
        emit: (value: MagmaPlayer) => void;
    };
    readonly error: {
        emit: (value: MagmaPlayerError) => void;
    };
    readonly play: {
        emit: (value: void) => void;
    };
    readonly pause: {
        emit: (value: void) => void;
    };
    readonly timeupdate: {
        emit: (value: number) => void;
    };
    readonly ended: {
        emit: (value: void) => void;
    };
    readonly seeked: {
        emit: (value: number) => void;
    };
    readonly warning: {
        emit: (value: MagmaPlayerError) => void;
    };
    readonly sizechange: {
        emit: (value: {
            width: number;
            height: number;
        }) => void;
    };
    readonly isPlaying: {
        (): boolean;
        set(value: boolean): void;
        update(fn: (value: boolean) => boolean): void;
    };
    readonly isReady: {
        (): boolean;
        set(value: boolean): void;
        update(fn: (value: boolean) => boolean): void;
    };
    readonly isPaused: {
        (): boolean;
        set(value: boolean): void;
        update(fn: (value: boolean) => boolean): void;
    };
    readonly currentTime: {
        (): number;
        set(value: number): void;
        update(fn: (value: number) => number): void;
    };
    readonly duration: {
        (): number;
        set(value: number): void;
        update(fn: (value: number) => number): void;
    };
    readonly videoWidth: {
        (): number;
        set(value: number): void;
        update(fn: (value: number) => number): void;
    };
    readonly videoHeight: {
        (): number;
        set(value: number): void;
        update(fn: (value: number) => number): void;
    };
    readonly volume: {
        (): number;
        set(value: number): void;
        update(fn: (value: number) => number): void;
    };
    readonly playbackRate: {
        (): number;
        set(value: number): void;
        update(fn: (value: number) => number): void;
    };
    readonly loop: {
        (): boolean;
        set(value: boolean): void;
        update(fn: (value: boolean) => boolean): void;
    };
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
