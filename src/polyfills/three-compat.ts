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

// Note: Color/Vector2/Vector3/Vector4/Matrix3/Matrix4 already ship native
// toArray() as of three@0.175.0 (the version pinned in package.json), so no
// shims are needed for them. Only THREE.Plane lacks one. Re-check this file
// after any three.js upgrade.

