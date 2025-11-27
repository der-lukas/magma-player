# Magma Player

A reusable library for compositing color and alpha mask videos with perfect synchronization using a shared clock.

## Features

- ✅ **Perfect Sync** - Uses `performance.now()` shared clock to eliminate desync
- ✅ **WebGL Compositing** - Automatic WebGL rendering for best performance (WebGL2 when available)
- ✅ **Canvas2D Fallback** - Falls back to Canvas2D if WebGL unavailable
- ✅ **Framework Agnostic** - Works in React, Vue, vanilla JS, or any framework
- ✅ **TypeScript Support** - Full TypeScript definitions included
- ✅ **Small Bundle** - Lightweight, no heavy dependencies
- ✅ **Cross-Browser** - Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ **Performance Optimized** - Frame throttling, texture caching, canvas reuse
- ✅ **Retina Support** - Automatic pixel ratio scaling for high-DPI displays
- ✅ **Event System** - Full event emitter API for playback events
- ✅ **Rich API** - Volume, playback speed, time/duration getters, loop control
- ✅ **Error Handling** - Custom error class with error codes for programmatic handling

## Installation

### Option 1: npm (when published)

```bash
npm install magma-player
```

### Option 2: Copy files directly

Copy the `magma` folder to your project:

```
src/
  magma/
    MagmaPlayer.js
    index.js
```

### Option 3: Use from CDN (UMD build)

```html
<script src="https://cdn.example.com/magma-player.umd.js"></script>
<script>
  const player = new MagmaPlayer.MagmaPlayer({ ... });
</script>
```

## Usage

### Vanilla JavaScript (Using Helper - Recommended)

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Magma Player Example</title>
  </head>
  <body>
    <canvas id="player-canvas"></canvas>

    <script type="module">
      import { createMagmaPlayer } from "./magma/vanilla/createMagmaPlayer.js";

      const { player } = createMagmaPlayer({
        colorVideoSrc: "color.mp4",
        maskVideoSrc: "mask.mp4",
        canvas: "#player-canvas", // Can use selector or element
        useWebGL: true,
        autoplay: false,
        autoCleanup: true, // Default: automatically cleanup on page unload
        onReady: () => console.log("Player ready!"),
        onError: (error) => console.error("Error:", error),
      });

      // Listen to events
      player.on("play", () => console.log("Playing"));
      player.on("pause", () => console.log("Paused"));
      player.on("timeupdate", (time) => console.log("Time:", time));

      // Control playback
      player.play();
      // Automatic cleanup on page unload (if autoCleanup: true)!
    </script>
  </body>
</html>
```

### Vanilla JavaScript (Direct Usage - Full Control)

Use `new MagmaPlayer()` directly when you need:

- Full access to all options (e.g., `waitForCanvas`, `canvasTimeout`)
- Canvas as a function (for dynamic canvas resolution)
- Custom cleanup logic
- Building framework wrappers

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Magma Player Example</title>
  </head>
  <body>
    <canvas id="player-canvas"></canvas>

    <script type="module">
      import { MagmaPlayer } from "./magma/MagmaPlayer.js";

      // MagmaPlayer supports canvas as element, selector, or function
      const player = new MagmaPlayer({
        colorVideoSrc: "color.mp4",
        maskVideoSrc: "mask.mp4",
        canvas: "#player-canvas", // Can use selector directly!
        // Or: canvas: document.getElementById("player-canvas")
        // Or: canvas: () => document.getElementById("player-canvas")
        // Or: canvas: canvas, waitForCanvas: true, canvasTimeout: 10000
        useWebGL: true,
        autoplay: false,
        targetFPS: 60,
        onReady: () => console.log("Player ready!"),
        onError: (error) => console.error("Error:", error),
      });

      player.on("play", () => console.log("Playing"));
      player.on("pause", () => console.log("Paused"));
      player.on("timeupdate", (time) => console.log("Time:", time));

      player.play();

      // Manual cleanup
      window.addEventListener("beforeunload", () => player.destroy());
    </script>
  </body>
</html>
```

### Hover Interaction Example

```javascript
const canvas = document.getElementById("player-canvas");
const player = new MagmaPlayer({
  colorVideoSrc: "color.mp4",
  maskVideoSrc: "mask.mp4",
  canvas: canvas,
  autoplay: false, // Important: disable autoplay for hover control
});

// User implements hover themselves
canvas.addEventListener("mouseenter", () => player.play());
canvas.addEventListener("mouseleave", () => player.reset());
```

### TypeScript

```typescript
import {
  MagmaPlayer,
  MagmaPlayerError,
  ERROR_CODES,
} from "@webp-utility/magma-player";
// Or: import { MagmaPlayer, MagmaPlayerError, ERROR_CODES } from './magma/MagmaPlayer.js';

const canvas = document.getElementById("player-canvas") as HTMLCanvasElement;

try {
  const player = new MagmaPlayer({
    colorVideoSrc: "color.mp4",
    maskVideoSrc: "mask.mp4",
    canvas: canvas,
    useWebGL: true,
    autoplay: false,
    strictDuration: true, // TypeScript will enforce type safety
  });

  player.on("ready", () => {
    console.log("Player ready!");
  });

  player.on("error", (error: MagmaPlayerError) => {
    if (error.code === ERROR_CODES.VIDEO_LOAD_FAILED) {
      console.error("Video failed to load:", error.details);
    }
  });
} catch (error) {
  if (error instanceof MagmaPlayerError) {
    console.error("MagmaPlayer error:", error.code, error.message);
  }
}
```

### React (Using Component - Simplest)

```jsx
import { MagmaPlayer } from "./magma/react/MagmaPlayer.jsx";

function VideoPlayer({ colorSrc, maskSrc }) {
  const playerRef = React.useRef(null);

  return (
    <div>
      <MagmaPlayer
        ref={playerRef}
        colorVideoSrc={colorSrc}
        maskVideoSrc={maskSrc}
        autoplay={false}
        useWebGL={true}
        repeatCount={-1} // Infinite loop
        onReady={(player) => console.log("Ready:", player)}
        onError={(error) => console.error("Error:", error)}
        style={{ maxWidth: "100%" }}
      />
      <button onClick={() => playerRef.current?.play()}>Play</button>
      <button onClick={() => playerRef.current?.setRepeatCount(3)}>
        Repeat 3x
      </button>
    </div>
  );
}
```

### React (Using Hook - More Control)

```jsx
import { useMagmaPlayer } from "./magma/react/useMagmaPlayer.js";

function VideoPlayer({ colorSrc, maskSrc }) {
  const { canvasRef, isReady, isPlaying, play, pause, setRepeatCount, error } =
    useMagmaPlayer({
      colorVideoSrc: colorSrc,
      maskVideoSrc: maskSrc,
      autoplay: false,
      useWebGL: true,
    });

  return (
    <div>
      <canvas ref={canvasRef} style={{ maxWidth: "100%" }} />
      {isReady && (
        <>
          <button onClick={isPlaying ? pause : play}>
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button onClick={() => setRepeatCount(-1)}>Infinite Loop</button>
          <button onClick={() => setRepeatCount(3)}>Repeat 3x</button>
        </>
      )}
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}
```

### React (Direct Usage - Full Control)

Use `new MagmaPlayer()` directly when you need:

- Full access to all options (e.g., `waitForCanvas`, `canvasTimeout`)
- Custom lifecycle management
- Building custom hooks or components

```jsx
import { useRef, useEffect } from "react";
import { MagmaPlayer } from "./magma/MagmaPlayer.js";

function VideoPlayer({ colorSrc, maskSrc }) {
  const canvasRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const player = new MagmaPlayer({
      colorVideoSrc: colorSrc,
      maskVideoSrc: maskSrc,
      canvas: canvasRef.current,
      // Or: canvas: () => canvasRef.current, waitForCanvas: true
      useWebGL: true,
      autoplay: false,
    });

    player.on("ready", () => console.log("Ready"));
    player.on("error", (error) => console.error("Error:", error));

    playerRef.current = player;

    return () => {
      player.destroy();
    };
  }, [colorSrc, maskSrc]);

  return <canvas ref={canvasRef} style={{ maxWidth: "100%" }} />;
}
```

### Vue

```vue
<template>
  <canvas ref="canvas"></canvas>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { MagmaPlayer } from "@webp-utility/magma-player";
// Or: import { MagmaPlayer } from './magma/MagmaPlayer.js';

const canvas = ref(null);
let player = null;

onMounted(() => {
  player = new MagmaPlayer({
    colorVideoSrc: "color.mp4",
    maskVideoSrc: "mask.mp4",
    canvas: canvas.value,
    useWebGL: true,
    autoplay: false,
  });

  player.on("ready", () => console.log("Ready"));
});

onUnmounted(() => {
  if (player) {
    player.destroy();
  }
});
</script>
```

### Angular (Using Component - Recommended)

```typescript
import { Component } from '@angular/core';
import { MagmaPlayerComponent } from './magma/angular/magma-player.component';
import type { MagmaPlayer } from './magma/MagmaPlayer.js';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [MagmaPlayerComponent],
  template: `
    <magma-player
      [colorVideoSrc]="'color.mp4'"
      [maskVideoSrc]="'mask.mp4'"
      [fixedSize]="{ width: 800, height: 600 }"
      [autoplay]="false"
      [useWebGL]="true"
      [repeatCount]="-1"
      (ready)="onPlayerReady($event)"
      (error)="onPlayerError($event)"
      (play)="onPlay()"
      (pause)="onPause()"
      (timeupdate)="onTimeUpdate($event)"
    />
    <button (click)="playerRef?.startPlayback()">Play</button>
    <button (click)="playerRef?.pausePlayback()">Pause</button>
    <button (click)="playerRef?.setRepeatCount(3)">Repeat 3x</button>
  `,
})
export class VideoPlayerComponent {
  playerRef: MagmaPlayerComponent | null = null;

  onPlayerReady(player: MagmaPlayer) {
    console.log('Player ready:', player);
    // Access the component instance to control playback
    // Note: You'll need to use @ViewChild to get the component reference
  }

  onPlayerError(error: any) {
    console.error('Player error:', error);
  }

  onPlay() {
    console.log('Playing');
  }

  onPause() {
    console.log('Paused');
  }

  onTimeUpdate(time: number) {
    console.log('Time:', time);
  }
}
```

**With ViewChild for programmatic control:**

```typescript
import { Component, ViewChild } from '@angular/core';
import { MagmaPlayerComponent } from './magma/angular/magma-player.component';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [MagmaPlayerComponent],
  template: `
    <magma-player
      #player
      [colorVideoSrc]="'color.mp4'"
      [maskVideoSrc]="'mask.mp4'"
      [autoplay]="false"
    />
    <button (click)="player.startPlayback()">Play</button>
    <button (click)="player.pausePlayback()">Pause</button>
    <button (click)="player.seek(10)">Seek to 10s</button>
  `,
})
export class VideoPlayerComponent {
  @ViewChild('player') player!: MagmaPlayerComponent;
}
```

**Reactive signals available on the component:**

```typescript
// Access reactive state
player.isPlaying()      // Signal<boolean>
player.isReady()        // Signal<boolean>
player.currentTime()    // Signal<number>
player.duration()       // Signal<number>
player.videoWidth()     // Signal<number>
player.videoHeight()    // Signal<number>
player.volume()         // Signal<number>
player.playbackRate()   // Signal<number>
```

### Angular (Direct Usage - Full Control)

Use `new MagmaPlayer()` directly when you need full control over the lifecycle:

```typescript
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MagmaPlayer } from './magma/MagmaPlayer.js';

@Component({
  selector: 'app-video-player',
  template: `<canvas #canvas></canvas>`,
})
export class VideoPlayerComponent implements OnInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private player: MagmaPlayer | null = null;

  ngOnInit() {
    // Wait for view to initialize
    setTimeout(() => {
      if (this.canvasRef?.nativeElement) {
        this.player = new MagmaPlayer({
          colorVideoSrc: 'color.mp4',
          maskVideoSrc: 'mask.mp4',
          canvas: this.canvasRef.nativeElement,
          useWebGL: true,
          autoplay: false,
        });

        this.player.on('ready', () => console.log('Ready'));
        this.player.on('error', (error) => console.error('Error:', error));
      }
    });
  }

  ngOnDestroy() {
    this.player?.destroy();
  }
}
```

## API

### Constructor Options

```typescript
new MagmaPlayer({
  colorVideoSrc: string,      // URL to color video (MP4)
  maskVideoSrc: string,        // URL to alpha mask video (MP4, grayscale)
  canvas: HTMLCanvasElement,   // Canvas element to render to
  useWebGL?: boolean,          // Use WebGL (default: true)
  autoplay?: boolean,          // Autoplay on ready (default: true)
  targetFPS?: number,          // Target frame rate (default: 60, use 30/24 for battery saving)
  onReady?: () => void,        // Callback when player is ready
  onError?: (error) => void,   // Callback for errors (receives MagmaPlayerError)
  strictDuration?: boolean,    // Throw error if video durations don't match (default: false)
})
```

### Playback Control Methods

- `play()` - Start playback
- `pause()` - Pause playback
- `seek(time)` - Seek to specific time (in seconds)
- `reset()` - Reset to time 0 and pause

### Volume Control

- `setVolume(volume)` - Set volume (0-1 range)
- `getVolume()` - Get current volume (0-1)

### Playback Speed Control

- `setPlaybackRate(rate)` - Set playback speed (0.25-4.0 range, default: 1.0)
- `getPlaybackRate()` - Get current playback rate

### Time & Duration Getters

- `getCurrentTime()` - Get current playback time (in seconds)
- `getDuration()` - Get video duration (in seconds)
- `getBuffered()` - Get buffered time ranges (array of `{start, end}` objects)

### Loop Control

- `setLoop(loop)` - Enable/disable infinite looping (boolean, default: true)
- `getLoop()` - Get current loop setting

### Repeat Control

- `setRepeatCount(count)` - Set total number of times to play (-1 = infinite loop, 0 = don't play, 1 = play once, >1 = play that many times total)
- `getRepeatCount()` - Get current repeat count

**Semantics (aligned with CSS `animation-iteration-count`):**

- `-1`: Infinite loop (plays forever)
- `0`: Don't play (0 iterations) - aligns with CSS
- `1`: Play once and stop (1 iteration)
- `3`: Play 3 times total (3 iterations)

```javascript
player.setRepeatCount(3); // Play 3 times total
player.setRepeatCount(-1); // Infinite loop
player.setRepeatCount(1); // Play once
player.setRepeatCount(0); // Don't play (0 iterations)
```

### Utility Methods

- `isPlaying()` - Check if currently playing
- `isPaused()` - Check if currently paused
- `getVideoWidth()` - Get video width in pixels
- `getVideoHeight()` - Get video height in pixels
- `setSize(width, height)` - Manually set canvas size

### Event System

- `on(event, callback)` - Add event listener
- `off(event, callback)` - Remove event listener

**Available Events:**

- `ready` - Player is ready and initialized
- `play` - Playback started
- `pause` - Playback paused
- `timeupdate` - Playback time updated (callback receives current time)
- `ended` - Playback ended (only if loop is disabled)
- `seeked` - Seek operation completed (callback receives seek time)
- `error` - Error occurred (callback receives error object)

### Cleanup

- `destroy()` - Clean up and destroy player instance (removes event listeners, stops playback, frees resources)

### Error Handling

MagmaPlayer uses a custom error class `MagmaPlayerError` with error codes for programmatic error handling:

```javascript
import { MagmaPlayer, MagmaPlayerError, ERROR_CODES } from './magma/MagmaPlayer.js';

try {
  const player = new MagmaPlayer({ ... });
} catch (error) {
  if (error instanceof MagmaPlayerError) {
    switch (error.code) {
      case ERROR_CODES.INVALID_INPUT:
        console.error('Invalid input:', error.message);
        break;
      case ERROR_CODES.VIDEO_LOAD_FAILED:
        console.error('Video failed to load:', error.details);
        break;
      // ... other error codes
    }
  }
}
```

**Error Codes:**

- `INVALID_INPUT` - Invalid constructor parameters
- `VIDEO_LOAD_FAILED` - Video failed to load
- `VIDEO_LOAD_TIMEOUT` - Video load timeout (30 seconds)
- `DURATION_MISMATCH` - Video durations don't match (only if `strictDuration: true`)
- `WEBGL_INIT_FAILED` - WebGL initialization failed (automatically falls back to Canvas2D)
- `CANVAS_REMOVED` - Canvas was removed from DOM during playback

## How It Works

1. **Shared Clock**: Uses `performance.now()` as a master clock to drive both videos
2. **Synchronization**: Both videos are synced to the same time using the shared clock
3. **Compositing**:
   - **WebGL**: Uploads both videos as textures and composites using a fragment shader (WebGL2 when available)
   - **Canvas2D**: Falls back to pixel-by-pixel compositing if WebGL unavailable
4. **Perfect Sync**: Videos never drift because they're both driven by the same clock
5. **Performance**: Texture uploads are cached, temp canvases are reused, frame throttling for low-end devices

## Performance Tips

1. **Frame Rate**: Use `targetFPS: 30` or `targetFPS: 24` for battery saving on mobile devices
2. **Autoplay**: Set `autoplay: false` if you want to control playback manually (e.g., on hover)
3. **WebGL**: WebGL is automatically used when available for best performance
4. **Retina Displays**: Pixel ratio scaling is automatic - no configuration needed
5. **Video Format**: Use H.264 MP4 with yuv420p for best compatibility and performance

## Browser Support

- ✅ Chrome/Edge: Full support (WebGL2 available)
- ✅ Firefox: Full support (WebGL2 available)
- ✅ Safari 16.4+: Full support (WebGL2 available)
- ✅ iOS Safari 16.4+: Full support

**Note**: Older browsers will automatically fall back to Canvas2D rendering if WebGL is unavailable.

## Video Format Requirements

- **Format**: MP4 (H.264, yuv420p)
- **Color Video**: Standard RGB video
- **Mask Video**: Grayscale video (white = opaque, black = transparent)
- **Dimensions**: Both videos must have identical dimensions
- **FPS**: Both videos must have identical frame rates
- **Duration**: Both videos must have identical durations (warnings shown if mismatch > 0.1s)

## Troubleshooting

### Videos don't load

- **Check CORS**: Ensure videos are served with proper CORS headers if loading from different domain
- **Check format**: Videos must be MP4 (H.264). Check browser console for codec errors
- **Check paths**: Verify video URLs are correct and accessible

### Autoplay doesn't work

- **Browser restrictions**: Many browsers block autoplay. Use `autoplay: false` and call `play()` after user interaction
- **Mobile devices**: iOS requires user interaction before playback can start

### Videos are out of sync

- **Check dimensions**: Videos must have identical dimensions
- **Check duration**: Videos should have identical durations (warnings shown if mismatch)
- **Check frame rate**: Videos should have identical frame rates

### WebGL not working

- **Automatic fallback**: Player automatically falls back to Canvas2D if WebGL unavailable
- **Context loss**: Player automatically handles WebGL context loss and restoration
- **Performance**: Canvas2D is slower but works everywhere

### Performance issues

- **Lower frame rate**: Use `targetFPS: 30` or `24` for better battery life
- **Check video size**: Large videos may cause performance issues
- **WebGL**: Ensure WebGL is available (check browser console for errors)

## License

MIT
