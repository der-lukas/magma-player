# Changelog

All notable changes to MagmaPlayer will be documented in this file.

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
