import * as THREE from 'three';
import { ARK, DECK_META } from './constants.js';

export function buildLighting(scene) {
  const hemi = new THREE.HemisphereLight(0xf0e8dc, 0x4a4038, 0.55);
  scene.add(hemi);
  const amb = new THREE.AmbientLight(0xe0d8cc, 0.42);
  scene.add(amb);
  const sun = new THREE.DirectionalLight(0xfff2d0, 0.35);
  sun.position.set(8, 6, -4);
  scene.add(sun);

  const deckLights = [];
  for (let d = 0; d < 7; d++) {
    const y = ARK.floorY[d] + 1.85;
    const l = new THREE.PointLight(0xfff4e6, 1.6, 8.5, 1.2);
    l.position.set(0.4, y, 0.2);
    scene.add(l);
    const pts = [l];
    if (d === 5) {
      const grow = new THREE.PointLight(0xff4499, 0.7, 5.5, 1.2);
      grow.position.set(2.0, y - 0.2, 0);
      scene.add(grow);
      pts.push(grow);
    }
    deckLights.push(pts);
  }

  const reds = [];
  for (let d = 0; d < 7; d++) {
    const strip = new THREE.PointLight(0xff2020, 0, 5, 1.6);
    strip.position.set(0, ARK.floorY[d] + 0.15, 2.4);
    scene.add(strip);
    reds.push(strip);
  }

  return {
    hemi,
    amb,
    sun,
    deckLights,
    reds,
    setCircadian(hour01) {
      const { intensity, color } = circadian(hour01);
      amb.intensity = 0.18 + intensity * 0.22;
      hemi.intensity = 0.2 + intensity * 0.28;
      hemi.color.set(color);
      for (let d = 0; d < 7; d++) {
        for (const l of deckLights[d]) {
          if (l.color.getHex() === 0xff4499) continue;
          l.intensity = 0.25 + intensity * 1.05;
          l.color.set(color);
        }
      }
    },
    setAlert(kind, t) {
      const pulse = 0.5 + 0.5 * Math.sin(t * (kind === 'warning' ? 3.14 : 6.28));
      for (const l of reds) l.intensity = kind === 'nominal' ? 0 : 0.4 + pulse * 0.8;
      if (kind === 'fire') {
        amb.intensity = 0.05;
        for (const pts of deckLights) for (const l of pts) l.intensity = 0.05;
      }
    },
    setVisibleDecks(lo, hi) {
      for (let d = 0; d < 7; d++) {
        const on = d >= lo && d <= hi;
        for (const l of deckLights[d]) l.visible = on;
        reds[d].visible = on;
      }
    },
    spinSun(dt) {
      const w = (Math.PI * 2) / 1200;
      sun.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), w * dt);
    },
    deckTint(d) {
      return DECK_META[d].shaft;
    },
  };
}

function circadian(u) {
  const h = ((u % 1) + 1) % 1;
  if (h < 0.08) return { intensity: 0.3 + (h / 0.08) * 0.7, color: 0xffe8c8 };
  if (h < 0.5) return { intensity: 1, color: 0xf2f4f8 };
  if (h < 0.62) return { intensity: 0.7, color: 0xffd0a0 };
  return { intensity: 0.12, color: 0xffb060 };
}
