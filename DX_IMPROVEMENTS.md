# Developer Experience Improvements

This document shows how the new helper functions and hooks improve DX compared to using MagmaPlayer directly.

## React Hook: `useMagmaPlayer`

### Before (Manual Management - ~50 lines)

```jsx
function VideoPlayer({ colorSrc, maskSrc }) {
  const canvasRef = useRef(null);
  const playerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);

  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    const player = new MagmaPlayer({
      colorVideoSrc: colorSrc,
      maskVideoSrc: maskSrc,
      canvas,
      useWebGL: true,
      onReady: () => {
        setIsReady(true);
        if (onReadyRef.current) {
          onReadyRef.current(player);
        }
      },
      onError: (err) => {
        setError(err);
      },
    });

    player.on("play", () => setIsPlaying(true));
    player.on("pause", () => setIsPlaying(false));

    playerRef.current = player;

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [colorSrc, maskSrc]);

  return (
    <div>
      <canvas ref={canvasRef} />
      {isReady && (
        <button
          onClick={() =>
            playerRef.current?.isPlaying()
              ? playerRef.current.pause()
              : playerRef.current.play()
          }
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
      )}
    </div>
  );
}
```

### After (With Hook - ~15 lines)

```jsx
import { useMagmaPlayer } from "./magma/react/useMagmaPlayer.js";

function VideoPlayer({ colorSrc, maskSrc }) {
  const { canvasRef, isReady, isPlaying, play, pause, error } = useMagmaPlayer({
    colorVideoSrc: colorSrc,
    maskVideoSrc: maskSrc,
    autoplay: true,
  });

  return (
    <div>
      <canvas ref={canvasRef} />
      {isReady && (
        <button onClick={isPlaying ? pause : play}>
          {isPlaying ? "Pause" : "Play"}
        </button>
      )}
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}
```

**Benefits:**

- ✅ Automatic lifecycle management
- ✅ Reactive state (isReady, isPlaying, etc.)
- ✅ No manual ref management
- ✅ No manual cleanup code
- ✅ Cleaner, more readable code

## Vanilla JS Helper: `createMagmaPlayer`

### Before (Manual Setup - ~30 lines)

```javascript
import { MagmaPlayer } from "./magma/MagmaPlayer.js";

const canvas = document.getElementById("my-canvas");
if (!canvas) {
  throw new Error("Canvas not found");
}

const player = new MagmaPlayer({
  colorVideoSrc: "color.mp4",
  maskVideoSrc: "mask.mp4",
  canvas: canvas,
  useWebGL: true,
  autoplay: true,
  onReady: () => {
    console.log("Ready!");
  },
  onError: (error) => {
    console.error("Error:", error);
  },
});

// Manual cleanup needed
window.addEventListener("beforeunload", () => {
  player.destroy();
});
```

### After (With Helper - ~10 lines)

```javascript
import { createMagmaPlayer } from "./magma/vanilla/createMagmaPlayer.js";

const { player } = createMagmaPlayer({
  colorVideoSrc: "color.mp4",
  maskVideoSrc: "mask.mp4",
  canvas: "#my-canvas", // Can use selector or element
  autoplay: true,
  autoCleanup: true, // Default: automatically cleanup on page unload
  onReady: () => console.log("Ready!"),
  onError: (error) => console.error("Error:", error),
});

// Automatic cleanup on page unload (if autoCleanup: true)!
// Or call destroy() manually if needed
```

**Benefits:**

- ✅ Canvas selector support (no need to query manually)
- ✅ Automatic cleanup on page unload
- ✅ Less boilerplate
- ✅ Better error handling

## Comparison Table

| Feature              | Direct Usage | React Hook   | Vanilla Helper |
| -------------------- | ------------ | ------------ | -------------- |
| Lifecycle Management | Manual       | ✅ Automatic | ✅ Automatic   |
| State Management     | Manual       | ✅ Reactive  | Manual         |
| Canvas Resolution    | Manual       | ✅ Automatic | ✅ Automatic   |
| Cleanup              | Manual       | ✅ Automatic | ✅ Automatic   |
| Boilerplate          | High         | Low          | Low            |
| Framework Support    | All          | React only   | All            |

## When to Use What

- **Direct `MagmaPlayer`**: When you need full control or are building a framework wrapper
- **`useMagmaPlayer` hook**: When using React - provides best DX
- **`createMagmaPlayer` helpers**: When using vanilla JS or other frameworks - reduces boilerplate
