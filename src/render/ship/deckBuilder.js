import * as THREE from 'three';
import { ARK, DECK_META } from './constants.js';
import { buildDeckShell } from './hullStructure.js';
import { buildFixture } from './props.js';
import { framedPort, bayWindow, buildCupola } from './windows.js';

export function buildDeck(cfg, mats, interactables, seats) {
  const group = new THREE.Group();
  group.name = cfg.id;
  group.userData.index = cfg.index;
  const shell = new THREE.Group();
  const fit = new THREE.Group();
  group.add(shell, fit);
  const y0 = ARK.floorY[cfg.index];
  buildDeckShell(shell, mats, cfg.index);
  if (cfg.index === 0) buildCupola(shell, mats);
  if (cfg.bay) {
    const bay = bayWindow(shell, mats, y0);
    interactables.push({ ...bay, deck: 3 });
  }
  for (const a of cfg.windows || []) {
    if (cfg.bay && a === 0) continue;
    framedPort(shell, mats, a, y0 + 1.35, cfg.index === 2 ? 0.15 : 0.22, 3 + cfg.index);
  }
  const ctx = {
    parent: fit,
    mats,
    y0,
    interactables,
    seats,
    deck: cfg.index,
  };
  for (const f of cfg.fixtures) buildFixture(f.type, f, ctx);
  group.userData.shelter = ctx.shelter || null;
  group.userData.meta = DECK_META[cfg.index];
  group.userData.fit = fit;
  group.userData.shell = shell;
  return group;
}
