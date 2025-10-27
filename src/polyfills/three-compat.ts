import * as THREE from 'three';

// This module centralizes compatibility shims for libraries that expect
// certain Three.js objects to expose a toArray() method or may throw
// when uploading uniforms. Import this file once at app startup.

// THREE.Plane
if (!(THREE.Plane.prototype as any).toArray) {
  (THREE.Plane.prototype as any).toArray = function (array: number[] = [], offset = 0) {
    array[offset] = this.normal.x;
    array[offset + 1] = this.normal.y;
    array[offset + 2] = this.normal.z;
    array[offset + 3] = this.constant;
    return array;
  };
}

// THREE.Color
if (!(THREE.Color.prototype as any).toArray) {
  (THREE.Color.prototype as any).toArray = function (array: number[] = [], offset = 0) {
    array[offset] = this.r;
    array[offset + 1] = this.g;
    array[offset + 2] = this.b;
    return array;
  };
}

// THREE.Vector2
if (!(THREE.Vector2.prototype as any).toArray) {
  (THREE.Vector2.prototype as any).toArray = function (array: number[] = [], offset = 0) {
    array[offset] = this.x;
    array[offset + 1] = this.y;
    return array;
  };
}

// THREE.Vector3
if (!(THREE.Vector3.prototype as any).toArray) {
  (THREE.Vector3.prototype as any).toArray = function (array: number[] = [], offset = 0) {
    array[offset] = this.x;
    array[offset + 1] = this.y;
    array[offset + 2] = this.z;
    return array;
  };
}

// THREE.Vector4
if (!(THREE.Vector4.prototype as any).toArray) {
  (THREE.Vector4.prototype as any).toArray = function (array: number[] = [], offset = 0) {
    array[offset] = this.x;
    array[offset + 1] = this.y;
    array[offset + 2] = this.z;
    array[offset + 3] = this.w;
    return array;
  };
}

// Matrix types
if (!(THREE.Matrix3.prototype as any).toArray) {
  (THREE.Matrix3.prototype as any).toArray = function (array: number[] = [], offset = 0) {
    const elements = this.elements;
    for (let i = 0; i < 9; i++) {
      array[offset + i] = elements[i];
    }
    return array;
  };
}

if (!(THREE.Matrix4.prototype as any).toArray) {
  (THREE.Matrix4.prototype as any).toArray = function (array: number[] = [], offset = 0) {
    const elements = this.elements;
    for (let i = 0; i < 16; i++) {
      array[offset + i] = elements[i];
    }
    return array;
  };
}

// Intentionally avoid touching internal WebGLUniforms to prevent bundler warnings


