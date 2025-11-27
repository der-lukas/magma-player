# MagmaPlayer Production Readiness Improvements Plan

## Overview
This document outlines the plan to make MagmaPlayer production-ready by addressing input validation, edge cases, error handling, testing, and TypeScript support.

## Priority Levels
- **P0 (Critical)**: Must have for production
- **P1 (High)**: Should have for production
- **P2 (Nice to have)**: Improves developer experience

---

## 1. Input Validation (P0)

### 1.1 Constructor Parameter Validation
**Location**: `MagmaPlayer.js` constructor

**Tasks**:
- [ ] Validate `colorVideoSrc` - must be non-empty string
- [ ] Validate `maskVideoSrc` - must be non-empty string  
- [ ] Validate `canvas` - must be HTMLCanvasElement instance
- [ ] Validate `useWebGL` - must be boolean (if provided)
- [ ] Validate `autoplay` - must be boolean (if provided)
- [ ] Validate `targetFPS` - must be number between 1-120 (if provided)
- [ ] Validate `onReady` - must be function or undefined (if provided)
- [ ] Validate `onError` - must be function or undefined (if provided)

**Implementation Approach**:
```javascript
// Create validation helper methods
_validateConstructorParams({ colorVideoSrc, maskVideoSrc, canvas, ... }) {
  if (!colorVideoSrc || typeof colorVideoSrc !== 'string') {
    throw new Error('MagmaPlayer: colorVideoSrc must be a non-empty string');
  }
  if (!maskVideoSrc || typeof maskVideoSrc !== 'string') {
    throw new Error('MagmaPlayer: maskVideoSrc must be a non-empty string');
  }
  if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
    throw new Error('MagmaPlayer: canvas must be an HTMLCanvasElement');
  }
  // ... rest of validations
}
```

**Error Format**: Use consistent error messages with "MagmaPlayer:" prefix for easy filtering

---

## 2. Edge Case Handling (P0)

### 2.1 Prevent Multiple init() Calls
**Location**: `MagmaPlayer.js` init() method

**Issue**: If init() is called multiple times, it could create duplicate video elements or event listeners.

**Solution**:
- Add `_initializing` flag to track if init is in progress
- Add `_initPromise` to prevent concurrent initialization
- Return existing promise if init is already in progress

**Implementation**:
```javascript
async init() {
  // Prevent concurrent initialization
  if (this._initializing) {
    return this._initPromise;
  }
  
  if (this.isInitialized) {
    console.warn('MagmaPlayer: Already initialized');
    return;
  }
  
  this._initializing = true;
  this._initPromise = this._doInit();
  // ... rest of init
}
```

### 2.2 Handle Canvas Removal from DOM
**Location**: `MagmaPlayer.js` render loop

**Issue**: If canvas is removed from DOM during playback, rendering will fail silently.

**Solution**:
- Check if canvas is still connected to DOM in render loop
- Pause playback if canvas is disconnected
- Emit warning event
- Resume automatically if canvas is reconnected

**Implementation**:
```javascript
renderLoop() {
  // Check if canvas is still in DOM
  if (!this.canvas.isConnected) {
    if (this.isPlaying) {
      this.pause();
      this.emit('warning', new Error('Canvas removed from DOM, playback paused'));
    }
    return;
  }
  // ... rest of render loop
}
```

### 2.3 Improve Video Duration Mismatch Handling
**Location**: `MagmaPlayer.js` validateVideos() method

**Current**: Warns but continues

**Options**:
1. Add constructor option `strictDuration: boolean` (default: false)
2. If strict, throw error if duration mismatch > threshold
3. If not strict, use shorter duration and warn

**Implementation**:
```javascript
constructor({ ..., strictDuration = false }) {
  this.strictDuration = strictDuration;
  // ...
}

validateVideos() {
  const durationDiff = Math.abs(colorDuration - maskDuration);
  if (durationDiff > 0.1) {
    if (this.strictDuration) {
      throw new Error(`Video duration mismatch: ${durationDiff.toFixed(2)}s`);
    } else {
      console.warn(`Video duration mismatch: ${durationDiff.toFixed(2)}s`);
      // Use shorter duration
      this.duration = Math.min(colorDuration, maskDuration);
    }
  }
}
```

---

## 3. Error Handling Improvements (P1)

### 3.1 Error Codes
**Location**: Throughout `MagmaPlayer.js`

**Approach**: Create error class with codes for programmatic handling

**Implementation**:
```javascript
class MagmaPlayerError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'MagmaPlayerError';
    this.code = code;
    this.details = details;
  }
}

// Error codes
const ERROR_CODES = {
  INVALID_INPUT: 'INVALID_INPUT',
  VIDEO_LOAD_FAILED: 'VIDEO_LOAD_FAILED',
  VIDEO_LOAD_TIMEOUT: 'VIDEO_LOAD_TIMEOUT',
  DURATION_MISMATCH: 'DURATION_MISMATCH',
  WEBGL_INIT_FAILED: 'WEBGL_INIT_FAILED',
  CANVAS_REMOVED: 'CANVAS_REMOVED',
};
```

### 3.2 User-Friendly Error Messages
**Location**: All error throwing locations

**Approach**: Provide both technical and user-friendly messages

**Implementation**:
```javascript
throw new MagmaPlayerError(
  ERROR_CODES.VIDEO_LOAD_FAILED,
  'Failed to load video. Please check the video URL and format (MP4 H.264 required).',
  { videoType: 'color', url: this.colorVideoSrc }
);
```

---

## 4. Testing (P1)

### 4.1 Test Framework Setup
**Location**: Root of project

**Tasks**:
- [ ] Install testing framework (Vitest recommended - faster, ESM native)
- [ ] Create `vitest.config.js` or add to existing config
- [ ] Add test script to package.json
- [ ] Create `src/magma/__tests__/` directory

**Package.json additions**:
```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "jsdom": "^23.0.0"
  }
}
```

### 4.2 Core Functionality Tests
**Location**: `src/magma/__tests__/MagmaPlayer.test.js`

**Test Cases**:
- [ ] Constructor with valid parameters
- [ ] Constructor with invalid parameters (should throw)
- [ ] Initialization success
- [ ] play() method
- [ ] pause() method
- [ ] seek() method
- [ ] reset() method
- [ ] setVolume() / getVolume()
- [ ] setPlaybackRate() / getPlaybackRate()
- [ ] setLoop() / getLoop()
- [ ] getCurrentTime() / getDuration()
- [ ] Event emission (ready, play, pause, timeupdate, ended)

### 4.3 Error Handling Tests
**Location**: `src/magma/__tests__/MagmaPlayer.errors.test.js`

**Test Cases**:
- [ ] Invalid colorVideoSrc
- [ ] Invalid maskVideoSrc
- [ ] Invalid canvas
- [ ] Video load timeout
- [ ] Video load failure
- [ ] WebGL fallback to Canvas2D
- [ ] Duration mismatch (strict vs non-strict)

### 4.4 Edge Case Tests
**Location**: `src/magma/__tests__/MagmaPlayer.edge-cases.test.js`

**Test Cases**:
- [ ] Multiple init() calls
- [ ] Canvas removed from DOM
- [ ] destroy() during playback
- [ ] Multiple player instances
- [ ] Rapid play/pause/seek calls
- [ ] WebGL context loss/restore

### 4.5 Test Utilities
**Location**: `src/magma/__tests__/helpers.js`

**Utilities Needed**:
- Mock video elements
- Mock canvas
- Test video URLs (or create test videos)
- Wait helpers for async operations

---

## 5. TypeScript Definitions (P2)

### 5.1 Create TypeScript Definition File
**Location**: `src/magma/MagmaPlayer.d.ts`

**Tasks**:
- [ ] Define MagmaPlayerOptions interface
- [ ] Define MagmaPlayer class
- [ ] Define event types
- [ ] Define error types
- [ ] Export all types

**Structure**:
```typescript
export interface MagmaPlayerOptions {
  colorVideoSrc: string;
  maskVideoSrc: string;
  canvas: HTMLCanvasElement;
  useWebGL?: boolean;
  autoplay?: boolean;
  targetFPS?: number;
  onReady?: () => void;
  onError?: (error: MagmaPlayerError) => void;
  strictDuration?: boolean;
}

export type MagmaPlayerEvent = 
  | 'ready' 
  | 'play' 
  | 'pause' 
  | 'timeupdate' 
  | 'ended' 
  | 'seeked' 
  | 'error' 
  | 'warning';

export class MagmaPlayerError extends Error {
  code: string;
  details: Record<string, any>;
}

export class MagmaPlayer {
  // ... all methods with types
}
```

---

## Implementation Order

### Phase 1: Critical Fixes (P0)
1. Input validation
2. Edge case: Multiple init() calls
3. Edge case: Canvas removal detection

### Phase 2: Error Handling (P1)
4. Error codes and better messages
5. Video duration mismatch handling

### Phase 3: Testing (P1)
6. Test framework setup
7. Core functionality tests
8. Error handling tests
9. Edge case tests

### Phase 4: Developer Experience (P2)
10. TypeScript definitions

---

## Estimated Time

- **Phase 1**: 2-3 hours
- **Phase 2**: 1-2 hours
- **Phase 3**: 4-6 hours
- **Phase 4**: 1-2 hours

**Total**: ~8-13 hours

---

## Success Criteria

✅ All constructor parameters validated  
✅ Edge cases handled gracefully  
✅ Error messages are user-friendly with codes  
✅ Test coverage > 80% for core functionality  
✅ TypeScript definitions available  
✅ No memory leaks  
✅ Documentation updated

---

## Notes

- Keep backward compatibility - all changes should be additive or non-breaking
- Update README.md with new options (strictDuration, etc.)
- Update example.html to demonstrate new features
- Consider adding CHANGELOG.md entries for each phase

