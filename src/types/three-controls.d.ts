declare module 'three/examples/jsm/controls/TransformControls' {
  export class TransformControls extends THREE.Object3D {
    constructor(camera: THREE.Camera, domElement?: HTMLElement);
    object?: THREE.Object3D | null;
    axis: string | null;
    mode: 'translate' | 'rotate' | 'scale';
    translationSnap: number | null;
    rotationSnap: number | null;
    scaleSnap: number | null;
    space: 'world' | 'local';
    size: number;
    showX: boolean;
    showY: boolean;
    showZ: boolean;
    dragging: boolean;
    addEventListener: (type: string, listener: (event: { value?: unknown; mode?: string }) => void) => void;
    removeEventListener: (type: string, listener: (event: { value?: unknown; mode?: string }) => void) => void;
    attach(object: THREE.Object3D): void;
    detach(): void;
    dispose(): void;
    setMode(mode: 'translate' | 'rotate' | 'scale'): void;
    setTranslationSnap(snap: number | null): void;
    setRotationSnap(snap: number | null): void;
    setScaleSnap(snap: number | null): void;
    setSize(size: number): void;
    setSpace(space: 'world' | 'local'): void;
    getHelper(): THREE.Object3D;
  }
}

declare module 'three/examples/jsm/controls/TransformControls.js' {
  export * from 'three/examples/jsm/controls/TransformControls';
}
