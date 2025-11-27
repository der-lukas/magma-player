const fs = require('fs');
const path = require('path');

const stubContent = `// Stub type definitions for compilation only
// Angular is a peer dependency and will be provided by the consuming project
declare module '@angular/core' {
  export interface OnInit {
    ngOnInit(): void;
  }
  export interface OnDestroy {
    ngOnDestroy(): void;
  }
  export function Component(options: any): any;
  export function Directive(options: any): any;
  export function Injectable(options?: any): any;
  export function Input(options?: any): any;
  export function Output(options?: any): any;
  export function effect(fn: () => void): () => void;
  export function input<T = any>(options?: any): () => T;
  export namespace input {
    function required<T = any>(options?: any): () => T;
  }
  export function output<T = any>(): { emit: (value: T) => void };
  export function signal<T>(initialValue: T): {
    (): T;
    set(value: T): void;
    update(fn: (value: T) => T): void;
  };
  export function viewChild<T = any>(selector: any, options?: any): () => T | undefined;
  export class ElementRef<T = any> {
    nativeElement: T;
    constructor(nativeElement: T);
  }
  export type ElementRef<T = any> = ElementRef<T>;
}
`;

const stubPath = path.join(__dirname, '../angular/@angular__core.d.ts');
fs.writeFileSync(stubPath, stubContent);

