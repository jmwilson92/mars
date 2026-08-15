import * as THREE from 'three';
import earthUrl from '../../assets/textures/earth.jpg';
import marsUrl from '../../assets/textures/mars.jpg';
import concreteUrl from '../../assets/textures/concrete.jpg';
import sandUrl from '../../assets/textures/sand.jpg';
import regolithUrl from '../../assets/textures/regolith.jpg';
import steelUrl from '../../assets/textures/steel.jpg';
import heatUrl from '../../assets/textures/heattile.jpg';

function tile(tex, repeat) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(repeat, repeat);
  return tex;
}

function colorMap(tex) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function solid(hex) {
  const c = document.createElement('canvas');
  c.width = c.height = 4;
  const g = c.getContext('2d');
  g.fillStyle = `#${hex.toString(16).padStart(6, '0')}`;
  g.fillRect(0, 0, 4, 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function loadOne(loader, url) {
  return new Promise((resolve) => {
    loader.load(url, resolve, undefined, () => resolve(null));
  });
}

export async function loadTextures() {
  const loader = new THREE.TextureLoader();
  const [earth, mars, concrete, sand, regolith, steel, steelB, heattile] = await Promise.all([
    loadOne(loader, earthUrl),
    loadOne(loader, marsUrl),
    loadOne(loader, concreteUrl),
    loadOne(loader, sandUrl),
    loadOne(loader, regolithUrl),
    loadOne(loader, steelUrl),
    loadOne(loader, steelUrl),
    loadOne(loader, heatUrl),
  ]);
  return {
    earth: colorMap(earth ?? solid(0x1a4a8c)),
    mars: colorMap(mars ?? solid(0xc1784a)),
    concrete: tile(concrete ?? solid(0x8a8a86), 18),
    sand: tile(sand ?? solid(0xc2a46a), 40),
    regolith: tile(regolith ?? solid(0xb86a38), 48),
    steel: tile(steel ?? solid(0xb8c0c8), 4),
    steelFine: tile(steelB ?? solid(0xc5ccd3), 1.6),
    heattile: tile(heattile ?? solid(0x161616), 10),
  };
}

export function makeSkyTexture(top, bottom) {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, top);
  grd.addColorStop(0.55, bottom);
  grd.addColorStop(1, bottom);
  g.fillStyle = grd;
  g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
