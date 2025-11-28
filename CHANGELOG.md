# Changelog

All notable changes to MagmaPlayer will be documented in this file.

## [1.2.1] - 2025-01-XX

### Fixed
- First frame rendering now works reliably for multiple instances
- Instances now appear immediately as posters, even when paused
- Playback now waits for videos to be fully buffered before starting (prevents blank frames)
- First frame renders regardless of video currentTime (no longer requires time 0)
- Render loop now renders first frame even when paused (poster mode)

### Changed
- Improved first frame rendering logic: renders current frame immediately if available, only seeks to 0 if needed
- Playback start logic: `_isPlaying` is now set only after videos are buffered (canplay/canplaythrough)
- First frame rendering attempts multiple times with increasing delays for better reliability
- Lower readyState requirements for first frame (readyState >= 1) vs normal playback (readyState >= 2)

## [1.2.0] - 2025-01-XX

### Added
- iOS Safari performance optimizations (throttled sync, larger thresholds)
- Mobile device detection and optimizations (applies to all mobile, not just iOS)
- Improved WebGL context cleanup to prevent "Too many active WebGL contexts" warnings
- Better video buffering handling (waits for canplay/canplaythrough on all platforms)
- UHD display support with proper pixel ratio handling
- Multiple instance support improvements

### Fixed
- WebGL contexts now properly released on destroy (prevents context accumulation)
- Resolution issues on UHD displays (pixel ratio now always applied to internal canvas)
- Multiple instances now work correctly (each gets its own canvas and context)
- Improved context loss/restore handling
- Better error handling with Promise.allSettled for video loading

### Changed
- Mobile devices now use throttled sync checks (100ms interval) for smoother playback
- Mobile devices use larger sync threshold (0.1s vs 0.016s) to reduce stuttering
- Conservative texture updates on mobile devices for better performance
- Preload strategy: metadata on mobile, auto on desktop
- Always wait for buffering before playback (good practice for all platforms)

## [1.1.3] - Previous version

## [1.0.0] - 2025-11-24

### Added

- Initial release of MagmaPlayer
- Shared clock synchronization for perfect video sync
- WebGL compositing with automatic Canvas2D fallback
- Framework-agnostic design (works in React, Vue, vanilla JS, etc.)
- Support for ES modules, CommonJS, and UMD builds
- Play, pause, seek, and destroy methods
- Error handling and ready callbacks

### Features

- Perfect synchronization using `performance.now()` shared clock
- Automatic WebGL detection and fallback
- Zero dependencies
- Small bundle size (~7-12kb minified)
- Cross-browser support (Chrome, Firefox, Safari, Edge)
