import * as THREE from 'three';

function mat(hex, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color: hex,
    roughness: extra.roughness ?? 0.35,
    metalness: extra.metalness ?? 0.55,
    ...extra,
  });
}

function add(parent, geo, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

/** Generic humanoid work unit. White panels, dark joints. Not a licensed likeness. */
export function buildOptimus() {
  const g = new THREE.Group();
  g.name = 'optimus';
  const shell = mat(0xd8dde3, { roughness: 0.32, metalness: 0.62 });
  const joint = mat(0x1a1c20, { roughness: 0.5, metalness: 0.4 });
  const visor = mat(0x0a1218, { roughness: 0.15, metalness: 0.8, emissive: 0x143040, emissiveIntensity: 0.4 });

  add(g, new THREE.BoxGeometry(0.11, 0.06, 0.18), joint, -0.09, 0.04, 0.02);
  add(g, new THREE.BoxGeometry(0.11, 0.06, 0.18), joint, 0.09, 0.04, 0.02);
  add(g, new THREE.CapsuleGeometry(0.055, 0.42, 4, 8), shell, -0.09, 0.32, 0);
  add(g, new THREE.CapsuleGeometry(0.055, 0.42, 4, 8), shell, 0.09, 0.32, 0);
  add(g, new THREE.BoxGeometry(0.28, 0.12, 0.16), joint, 0, 0.56, 0);
  add(g, new THREE.BoxGeometry(0.34, 0.46, 0.2), shell, 0, 0.86, 0);
  add(g, new THREE.CapsuleGeometry(0.04, 0.36, 4, 8), shell, -0.22, 0.84, 0, 0, 0, 0.18);
  add(g, new THREE.CapsuleGeometry(0.04, 0.36, 4, 8), shell, 0.22, 0.84, 0, 0, 0, -0.18);
  add(g, new THREE.BoxGeometry(0.16, 0.18, 0.16), shell, 0, 1.2, 0);
  add(g, new THREE.BoxGeometry(0.22, 0.04, 0.08), visor, 0, 1.22, 0.08);
  return g;
}
