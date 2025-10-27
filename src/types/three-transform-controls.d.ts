declare module 'three/examples/jsm/controls/TransformControls.js' {
  import { Camera, Object3D } from 'three';
  import { EventDispatcher } from 'three';

  export class TransformControls extends EventDispatcher {
    constructor(camera: Camera, domElement?: HTMLElement);
    attach(object: Object3D): void;
    detach(): void;
    dispose(): void;
    getHelper(): Object3D;
    addEventListener(type: string, listener: (event: any) => void): void;
    removeEventListener(type: string, listener: (event: any) => void): void;
  }
} 