# Angular-Specific MagmaPlayer Integration

## Current Pain Points

Based on real-world usage in `chapter-test-dialog.component.ts`:

1. **Manual Lifecycle Management**: Need to manually call `destroy()` in `ngOnDestroy`
2. **ElementRef Handling**: Must access `.nativeElement` from `viewChild`
3. **Timing Issues**: Need `effect()` + `ngAfterViewInit` + `setTimeout` to ensure canvas is ready
4. **Change Detection**: Manual integration with Angular's change detection
5. **Signal Integration**: No reactive signals for player state
6. **Boilerplate**: ~50+ lines of initialization/destruction code

## Proposed Angular-Specific Solution

### Option 1: Angular Directive (Recommended)

```typescript
@Component({
  selector: 'app-chapter-test-dialog',
  template: `
    <canvas 
      appMagmaPlayer
      [colorVideoSrc]="'assets/shared/videos/color.mp4'"
      [maskVideoSrc]="'assets/shared/videos/mask.mp4'"
      [fixedSize]="{ width: 180, height: 180 }"
      [autoplay]="true"
      (ready)="onPlayerReady($event)"
      (error)="onPlayerError($event)"
    ></canvas>
  `
})
export class ChapterTestDialogComponent {
  onPlayerReady(player: MagmaPlayer) {
    console.log('Player ready:', player);
  }
  
  onPlayerError(error: MagmaPlayerError) {
    console.error('Player error:', error);
  }
}
```

**Benefits:**
- Zero boilerplate - directive handles everything
- Automatic lifecycle management
- Direct canvas element access (no ElementRef needed)
- Reactive inputs/outputs
- Works with `@if` conditionals automatically

**Implementation:**
```typescript
@Directive({
  selector: 'canvas[appMagmaPlayer]',
  standalone: true,
})
export class MagmaPlayerDirective implements OnInit, OnDestroy {
  // Inputs
  colorVideoSrc = input.required<string>();
  maskVideoSrc = input.required<string>();
  fixedSize = input<{ width: number; height: number }>();
  maxSize = input<{ width: number; height: number }>();
  autoplay = input<boolean>(true);
  useWebGL = input<boolean>(true);
  targetFPS = input<number>(60);
  
  // Outputs
  ready = output<MagmaPlayer>();
  error = output<MagmaPlayerError>();
  play = output<void>();
  pause = output<void>();
  timeupdate = output<number>();
  ended = output<void>();
  
  // Reactive state signals
  readonly isPlaying = signal(false);
  readonly isReady = signal(false);
  readonly currentTime = signal(0);
  readonly duration = signal(0);
  readonly videoWidth = signal(0);
  readonly videoHeight = signal(0);
  
  private _player: MagmaPlayer | null = null;
  private _elementRef = inject(ElementRef<HTMLCanvasElement>);
  
  ngOnInit() {
    const canvas = this._elementRef.nativeElement;
    
    this._player = new MagmaPlayer({
      colorVideoSrc: this.colorVideoSrc(),
      maskVideoSrc: this.maskVideoSrc(),
      canvas,
      fixedSize: this.fixedSize(),
      maxSize: this.maxSize(),
      autoplay: this.autoplay(),
      useWebGL: this.useWebGL(),
      targetFPS: this.targetFPS(),
      onReady: () => {
        this.isReady.set(true);
        this.ready.emit(this._player!);
      },
      onError: (error) => {
        this.error.emit(error);
      },
    });
    
    // Set up event listeners
    this._player.on('play', () => {
      this.isPlaying.set(true);
      this.play.emit();
    });
    
    this._player.on('pause', () => {
      this.isPlaying.set(false);
      this.pause.emit();
    });
    
    this._player.on('timeupdate', (time) => {
      this.currentTime.set(time);
      this.timeupdate.emit(time);
    });
    
    this._player.on('ended', () => {
      this.ended.emit();
    });
    
    // Update reactive signals
    effect(() => {
      if (this._player?.isReady()) {
        this.videoWidth.set(this._player.getVideoWidth());
        this.videoHeight.set(this._player.getVideoHeight());
        this.duration.set(this._player.getDuration());
      }
    });
  }
  
  ngOnDestroy() {
    this._player?.destroy();
    this._player = null;
  }
  
  // Expose player methods
  play() {
    this._player?.play();
  }
  
  pause() {
    this._player?.pause();
  }
  
  seek(time: number) {
    this._player?.seek(time);
  }
}
```

### Option 2: Angular Component Wrapper

```typescript
@Component({
  selector: 'app-magma-player',
  template: `<canvas #canvas></canvas>`,
  standalone: true,
})
export class MagmaPlayerComponent {
  // Similar API to directive but as a component
}
```

### Option 3: Service + Injection Token

```typescript
@Injectable({ providedIn: 'root' })
export class MagmaPlayerService {
  createPlayer(options: MagmaPlayerOptions): MagmaPlayer {
    return new MagmaPlayer(options);
  }
}
```

## Comparison: Framework-Specific vs Framework-Agnostic

### Framework-Agnostic (Current Approach)

**Pros:**
- ✅ Works everywhere (Angular, React, Vue, Svelte, vanilla JS)
- ✅ Single codebase to maintain
- ✅ Smaller bundle size (no framework dependencies)
- ✅ Framework-agnostic API improvements benefit everyone
- ✅ Can be used in any context (Node.js, Electron, etc.)

**Cons:**
- ❌ More boilerplate in each framework
- ❌ Framework-specific patterns not leveraged
- ❌ Manual lifecycle management
- ❌ No reactive integration out of the box

### Framework-Specific Versions

**Pros:**
- ✅ Best-in-class DX for each framework
- ✅ Leverages framework-specific features (signals, hooks, etc.)
- ✅ Automatic lifecycle management
- ✅ Better TypeScript integration
- ✅ Less boilerplate

**Cons:**
- ❌ Multiple codebases to maintain
- ❌ Framework lock-in
- ❌ Larger total bundle size
- ❌ API divergence between frameworks
- ❌ More complex release process

## Recommendation: Hybrid Approach

**Keep the core framework-agnostic** and **add framework-specific wrappers**:

```
libs/magma/
  ├── src/
  │   ├── lib/
  │   │   ├── MagmaPlayer.js          # Core (framework-agnostic)
  │   │   ├── MagmaPlayer.d.ts
  │   │   ├── angular/                 # Angular-specific
  │   │   │   ├── magma-player.directive.ts
  │   │   │   └── magma-player.component.ts (optional)
  │   │   ├── react/                  # React-specific (future)
  │   │   │   └── useMagmaPlayer.ts
  │   │   └── vue/                    # Vue-specific (future)
  │   │       └── useMagmaPlayer.ts
  │   └── index.ts                    # Export core
  └── angular/
      └── index.ts                    # Export Angular wrappers
```

**Benefits:**
- Core remains framework-agnostic (works everywhere)
- Framework wrappers provide best DX
- Users can choose: use core directly or use framework wrapper
- Progressive enhancement: start with core, upgrade to wrapper when needed

## Implementation Priority

1. **P0**: Keep improving core API (framework-agnostic improvements)
2. **P1**: Add Angular directive wrapper (if Angular usage is primary)
3. **P2**: Add React/Vue wrappers (if needed based on usage)

## Example: Current vs Angular Directive

**Current (50+ lines):**
```typescript
export class ChapterTestDialogComponent {
  readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('magmaCanvas');
  private _magmaPlayer: MagmaPlayer | null = null;
  
  constructor() {
    effect(() => {
      const canvasRef = this.canvasRef();
      const canvas = canvasRef?.nativeElement;
      const locked = this.isLocked();
      
      if (locked && canvas && canvas instanceof HTMLCanvasElement && !this._magmaPlayer) {
        setTimeout(() => {
          if (canvas && canvas instanceof HTMLCanvasElement && !this._magmaPlayer) {
            this._initializeMagmaPlayer(canvas);
          }
        }, 100);
      } else if (this._magmaPlayer && (!locked || !canvas)) {
        this._destroyMagmaPlayer();
      }
    });
  }
  
  ngAfterViewInit() {
    // Fallback initialization...
  }
  
  ngOnDestroy() {
    this._destroyMagmaPlayer();
  }
  
  private _initializeMagmaPlayer(canvas: HTMLCanvasElement) {
    // 50+ lines of initialization code...
  }
  
  private _destroyMagmaPlayer() {
    this._magmaPlayer?.destroy();
    this._magmaPlayer = null;
  }
}
```

**With Angular Directive (5 lines):**
```typescript
export class ChapterTestDialogComponent {
  // That's it! Directive handles everything
}
```

```html
<canvas 
  appMagmaPlayer
  [colorVideoSrc]="'assets/shared/videos/color.mp4'"
  [maskVideoSrc]="'assets/shared/videos/mask.mp4'"
  [fixedSize]="{ width: 180, height: 180 }"
  [autoplay]="true"
/>
```

## Conclusion

**Recommendation**: Build an Angular directive wrapper while keeping the core framework-agnostic.

- **Core library**: Continue improving (framework-agnostic)
- **Angular directive**: Add as a convenience wrapper
- **Other frameworks**: Add wrappers only if there's demand

This gives you:
- Best DX for Angular users (directive)
- Flexibility for other frameworks (core)
- Single source of truth (core)
- Progressive enhancement path

