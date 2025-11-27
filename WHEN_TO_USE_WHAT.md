# When to Use What: MagmaPlayer API Guide

## Quick Decision Tree

```
Need automatic cleanup on page unload?
├─ Yes → Use createMagmaPlayer() (vanilla JS)
└─ No → Continue...

Using React?
├─ Yes → Use useMagmaPlayer() hook
└─ No → Continue...

Need waitForCanvas or canvas as function?
├─ Yes → Use new MagmaPlayer() directly
└─ No → Use createMagmaPlayer() (vanilla JS) or new MagmaPlayer() (both work)
```

## Detailed Comparison

### `new MagmaPlayer()` - Direct API

**Use when:**

- ✅ You need full control over all options
- ✅ You need `waitForCanvas` option (wait for canvas to appear in DOM)
- ✅ You need `canvasTimeout` option (custom timeout for canvas waiting)
- ✅ Canvas is a function (dynamic canvas resolution)
- ✅ You're building framework wrappers or custom hooks
- ✅ You need custom cleanup logic
- ✅ You're in a framework that handles lifecycle (React, Vue, etc.)

**Features:**

- Full access to all options
- Canvas can be: `HTMLCanvasElement`, `string` (selector), or `function`
- No automatic cleanup (you manage it)
- More verbose but more flexible

**Example:**

```javascript
const player = new MagmaPlayer({
  colorVideoSrc: "color.mp4",
  maskVideoSrc: "mask.mp4",
  canvas: () => document.getElementById("canvas"), // Function!
  waitForCanvas: true, // Wait for canvas to appear
  canvasTimeout: 10000, // 10 second timeout
  // ... all other options
});

// Manual cleanup
window.addEventListener("beforeunload", () => player.destroy());
```

### `createMagmaPlayer()` - Vanilla JS Helper

**Use when:**

- ✅ You're using vanilla JavaScript (not React/Vue/etc.)
- ✅ You want automatic cleanup on page unload
- ✅ Canvas is available immediately (element or selector)
- ✅ You want less boilerplate
- ✅ You don't need `waitForCanvas` or `canvasTimeout`

**Features:**

- Adds `autoCleanup` option (defaults to `true`)
- Canvas can be: `HTMLCanvasElement` or `string` (selector)
- Throws error immediately if canvas not found (no waiting)
- Returns `destroy()` function that cleans up event listener
- Less verbose, more convenient

**Example:**

```javascript
const { player, destroy } = createMagmaPlayer({
  colorVideoSrc: "color.mp4",
  maskVideoSrc: "mask.mp4",
  canvas: "#my-canvas", // Selector or element
  autoCleanup: true, // Automatic cleanup on page unload
});

// Automatic cleanup on page unload!
// Or call destroy() manually if needed
```

### `MagmaPlayer` - React Component

**Use when:**

- ✅ You're using React
- ✅ You want the simplest declarative API
- ✅ You want to drop in a component and go
- ✅ You need basic player functionality

**Features:**

- Declarative API (just JSX props)
- Automatic lifecycle management
- Access player via ref for programmatic control
- All callbacks as props (onReady, onError, etc.)
- Styling props (className, style, canvasStyle)

**Example:**

```jsx
import { MagmaPlayer } from "./magma/react/MagmaPlayer.jsx";

const playerRef = React.useRef(null);

<MagmaPlayer
  ref={playerRef}
  colorVideoSrc={colorSrc}
  maskVideoSrc={maskSrc}
  autoplay={true}
  onReady={(player) => console.log("Ready:", player)}
/>;
```

### `useMagmaPlayer()` - React Hook

**Use when:**

- ✅ You're using React
- ✅ You need reactive state (isReady, isPlaying, etc.)
- ✅ You want full control over rendering
- ✅ You're building custom UI around the player

**Features:**

- Automatic lifecycle management (cleanup on unmount)
- Reactive state via hooks (isReady, isPlaying, currentTime, etc.)
- No manual ref management
- Canvas ref provided automatically
- Control methods (play, pause, seek, etc.)
- Full control over component structure

**Example:**

```jsx
const { canvasRef, isReady, isPlaying, play, pause } = useMagmaPlayer({
  colorVideoSrc: colorSrc,
  maskVideoSrc: maskSrc,
});
```

## Feature Matrix

| Feature                  | `new MagmaPlayer()`         | `createMagmaPlayer()`      | `<MagmaPlayer />` Component | `useMagmaPlayer()` Hook |
| ------------------------ | --------------------------- | -------------------------- | --------------------------- | ----------------------- |
| **Canvas Types**         | Element, Selector, Function | Element, Selector          | Element (via ref)           | Element (via ref)       |
| **waitForCanvas**        | ✅ Yes                      | ❌ No                      | ❌ No                       | ❌ No                   |
| **canvasTimeout**        | ✅ Yes                      | ❌ No                      | ❌ No                       | ❌ No                   |
| **Auto Cleanup**         | ❌ No (manual)              | ✅ Yes (optional)          | ✅ Yes (automatic)          | ✅ Yes (automatic)      |
| **Reactive State**       | ❌ No                       | ❌ No                      | ❌ No (use ref)             | ✅ Yes                  |
| **Lifecycle Management** | Manual                      | Manual (with auto cleanup) | ✅ Automatic                | ✅ Automatic            |
| **API Style**            | Imperative                  | Imperative                 | Declarative                 | Imperative              |
| **Framework**            | Any                         | Any                        | React only                  | React only              |
| **Boilerplate**          | High                        | Medium                     | Lowest                      | Low                     |

## Real-World Examples

### Example 1: Simple Vanilla JS Page

**Best choice:** `createMagmaPlayer()`

```javascript
// Simple, automatic cleanup, less code
const { player } = createMagmaPlayer({
  colorVideoSrc: "color.mp4",
  maskVideoSrc: "mask.mp4",
  canvas: "#player",
});
```

### Example 2: Canvas Appears Dynamically

**Best choice:** `new MagmaPlayer()` with `waitForCanvas`

```javascript
// Canvas might not exist yet
const player = new MagmaPlayer({
  colorVideoSrc: "color.mp4",
  maskVideoSrc: "mask.mp4",
  canvas: () => document.getElementById("canvas"),
  waitForCanvas: true,
  canvasTimeout: 5000,
});
```

### Example 3: Simple React Component

**Best choice:** `<MagmaPlayer />` component

```jsx
// Simplest - just drop it in
<MagmaPlayer colorVideoSrc={colorSrc} maskVideoSrc={maskSrc} autoplay={true} />
```

### Example 4: React Component with Custom UI

**Best choice:** `useMagmaPlayer()` hook

```jsx
// Need reactive state and custom UI
const { canvasRef, isReady, isPlaying, play, pause } = useMagmaPlayer({
  colorVideoSrc: colorSrc,
  maskVideoSrc: maskSrc,
});

return (
  <div>
    <canvas ref={canvasRef} />
    {isReady && (
      <CustomControls isPlaying={isPlaying} onPlay={play} onPause={pause} />
    )}
  </div>
);
```

### Example 5: Building a Custom Hook

**Best choice:** `new MagmaPlayer()` directly

```javascript
// Full control for custom implementation
function useCustomPlayer(options) {
  const player = new MagmaPlayer({
    ...options,
    waitForCanvas: true,
    // custom logic
  });
  // ...
}
```

## Summary

- **Most common case (vanilla JS):** Use `createMagmaPlayer()` - it's simpler and handles cleanup
- **React apps:** Use `useMagmaPlayer()` hook - best DX
- **Need advanced features:** Use `new MagmaPlayer()` directly - full control
- **Building wrappers:** Use `new MagmaPlayer()` directly - base API

The helper functions are convenience wrappers - they don't add functionality, they just reduce boilerplate and add automatic cleanup. The direct `new MagmaPlayer()` API is always available when you need full control.
