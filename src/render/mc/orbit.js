import * as THREE from 'three';
import { MC } from './palette.js';
import earthUrl from '../../../assets/textures/earth.jpg';
import marsUrl from '../../../assets/textures/mars.jpg';
import { countFleet } from '../../sim/fleet.js';

/** Wall plot. Distances in AU-scaled units. Planets oversized so they still read. */
const AU = 198;
const R_EARTH = 1.0 * AU;
const R_MARS = 1.524 * AU;
const A_HOH = (R_EARTH + R_MARS) / 2;
const E_HOH = (R_MARS - R_EARTH) / (R_MARS + R_EARTH);
const MARS_LEAD0 = 0.78;

export function createMainScreen(getState) {
  const rt = new THREE.WebGLRenderTarget(1920, 768, { type: THREE.UnsignedByteType });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070c);

  const cam = new THREE.OrthographicCamera(-960, 960, 384, -384, 0.1, 2400);
  cam.position.set(0, 0, 520);
  cam.lookAt(0, 0, 0);

  const root = new THREE.Group();
  // Level ecliptic, tipped just enough to read as a table-top plot.
  root.rotation.x = 0.48;
  scene.add(root);

  scene.add(new THREE.AmbientLight(0x8aa4c0, 1.15));
  const sunLight = new THREE.PointLight(0xfff4d0, 4.2, 1800, 0.9);
  root.add(sunLight);
  const key = new THREE.DirectionalLight(0xfff2d8, 1.6);
  key.position.set(80, 260, 200);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x9ab4d0, 0.7);
  fill.position.set(-120, 180, 80);
  scene.add(fill);

  const loader = new THREE.TextureLoader();
  const earthMap = loader.load(earthUrl);
  earthMap.colorSpace = THREE.SRGBColorSpace;
  const marsMap = loader.load(marsUrl);
  marsMap.colorSpace = THREE.SRGBColorSpace;

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(22, 24, 18),
    new THREE.MeshBasicMaterial({ color: 0xfff6c8 }),
  );
  root.add(sun);
  const sunHalo = new THREE.Mesh(
    new THREE.SphereGeometry(32, 16, 12),
    new THREE.MeshBasicMaterial({
      color: 0xffe08a,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    }),
  );
  root.add(sunHalo);

  const earth = planet(52, earthMap, 0x6aa8e8, 0.7);
  const mars = planet(28, marsMap, 0xd09058, 0.65);
  root.add(earth, mars);

  root.add(orbitLine(R_EARTH, MC.dataCyan, 1));
  root.add(orbitLine(R_MARS, MC.dataAmber, 1));
  root.add(ellipseLine(A_HOH, E_HOH, 0x3a4a58, 0.45, 0, Math.PI * 2));
  const transfer = ellipseLine(A_HOH, E_HOH, MC.dataAmber, 0.95, 0, Math.PI);
  root.add(transfer);

  const craft = new THREE.Mesh(
    new THREE.ConeGeometry(5, 14, 6),
    new THREE.MeshBasicMaterial({ color: MC.dataAmber }),
  );
  root.add(craft);

  const deck = new THREE.Mesh(
    new THREE.CircleGeometry(R_MARS + 36, 72),
    new THREE.MeshBasicMaterial({ color: 0x081018, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
  );
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = -1.2;
  root.add(deck);
  const grid = new THREE.GridHelper(720, 18, 0x143040, 0x0c1820);
  grid.position.y = -1;
  root.add(grid);

  const overlay = document.createElement('canvas');
  overlay.width = 1920;
  overlay.height = 768;
  const og = overlay.getContext('2d');
  const otex = new THREE.CanvasTexture(overlay);
  otex.colorSpace = THREE.SRGBColorSpace;
  const omesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1920, 768),
    new THREE.MeshBasicMaterial({ map: otex, transparent: true, depthTest: false }),
  );
  omesh.position.z = 10;
  scene.add(omesh);
  const scan = scanlines();
  scan.position.z = 11;
  scene.add(scan);

  let acc = 0;
  const u = { t: 0, mode: 'idle', call: '' };

  function setMode(mode, call = '') {
    u.mode = mode;
    u.call = call;
  }

  function paintOverlay() {
    og.clearRect(0, 0, 1920, 768);
    og.fillStyle = 'rgba(8,12,18,0.42)';
    og.fillRect(0, 0, 420, 768);
    og.fillRect(1500, 0, 420, 768);
    og.fillStyle = '#8aa0b0';
    og.font = '16px monospace';
    og.fillText('VEHICLE', 28, 40);
    og.fillStyle = '#c8d4e0';
    og.fillRect(40, 80, 28, 200);
    og.fillStyle = '#ffb000';
    og.fillRect(40, 180, 28, 100);
    og.fillStyle = '#8aa0b0';
    og.fillText('STAGE 2', 80, 160);
    og.fillText('STAGE 1', 80, 280);
    og.fillText('EARTH  1.00 AU', 28, 360);
    og.fillText('MARS   1.52 AU', 28, 388);

    const st = getState?.();
    const fleet = countFleet(st);
    og.fillStyle = '#8aa0b0';
    og.fillText('FLEET', 28, 440);
    og.fillStyle = '#c8d4e0';
    og.font = '18px monospace';
    og.fillText(`LEO        ${fleet.leo}`, 28, 472);
    og.fillText(`TO MARS    ${fleet.outbound}`, 28, 500);
    og.fillText(`AT MARS    ${fleet.mars}`, 28, 528);
    og.fillText(`RETURNING  ${fleet.returning}`, 28, 556);

    og.fillStyle = '#8aa0b0';
    og.font = '16px monospace';
    og.fillText('TELEMETRY', 1532, 40);
    og.fillStyle = '#c8d4e0';
    og.font = '18px monospace';
    og.fillText(`BUDGET  ${st ? Math.round((st.earth?.budget?.remaining || 0) / 1e9 * 10) / 10 + 'B' : '—'}`, 1532, 90);
    og.fillText(`SUPPORT ${st ? Math.round(st.earth?.politics?.support || 0) : '—'}`, 1532, 130);
    const days = st?.clock?.daysToWindow;
    og.fillStyle = '#ffb000';
    og.fillText(`WINDOW  ${days != null ? Math.ceil(days) + ' d' : '—'}`, 1532, 180);
    og.fillStyle = '#4fd8e8';
    og.fillText(`SOL     ${st ? Math.floor(st.clock.solOfYear) : '—'}`, 1532, 230);
    og.fillStyle = '#ffb000';
    og.font = '28px monospace';
    og.fillText(u.call || 'MISSION CONTROL', 460, 48);
    if (u.mode === 'ascent' || u.mode === 'edl' || u.mode === 'transit') {
      og.fillStyle = '#c8d4e0';
      og.font = '18px monospace';
      og.fillText(u.mode.toUpperCase(), 460, 720);
    }
    otex.needsUpdate = true;
  }

  function update(dt, renderer) {
    acc += dt;
    u.t += dt;
    earth.rotation.y += 0.12 * dt;
    mars.rotation.y += 0.07 * dt;

    // Continuous orbits. Earth ~365 d, Mars ~687 d, craft loops the transfer ellipse.
    const we = 0.11;
    const wm = we / 1.881;
    placeOnOrbit(earth, R_EARTH, u.t * we);
    placeOnOrbit(mars, R_MARS, MARS_LEAD0 + u.t * wm);
    const nu = (u.t * 0.09) % (Math.PI * 2);
    const r = transferR(nu);
    craft.position.set(r * Math.cos(nu), 0, r * Math.sin(nu));
    const ahead = nu + 0.08;
    const ra = transferR(ahead);
    craft.lookAt(ra * Math.cos(ahead), 0, ra * Math.sin(ahead));
    if (transfer.material) transfer.material.dashOffset = -u.t * 0.35;

    if (acc > 0.05) {
      acc = 0;
      paintOverlay();
      renderer.setRenderTarget(rt);
      renderer.render(scene, cam);
      renderer.setRenderTarget(null);
    }
  }

  const screenMat = new THREE.MeshBasicMaterial({ map: rt.texture });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(11.0, 4.4), screenMat);
  screen.position.set(0, 3.4, -9.69);

  return { screen, update, setMode, rt, scene, cam };
}

function transferR(nu) {
  return (A_HOH * (1 - E_HOH * E_HOH)) / (1 + E_HOH * Math.cos(nu));
}

function placeOnOrbit(mesh, radius, angle) {
  mesh.position.set(radius * Math.cos(angle), 0, radius * Math.sin(angle));
}

function planet(radius, map, emissive, emissiveIntensity) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 40, 28),
    new THREE.MeshStandardMaterial({
      map,
      color: 0xffffff,
      roughness: 0.55,
      metalness: 0,
      emissive,
      emissiveMap: map,
      emissiveIntensity,
    }),
  );
}

function orbitLine(r, color, opacity) {
  return ellipseLine(r, 0, color, opacity, 0, Math.PI * 2);
}

function ellipseLine(a, e, color, opacity, nu0, nu1) {
  const pts = [];
  const n = 96;
  for (let i = 0; i <= n; i++) {
    const nu = nu0 + ((nu1 - nu0) * i) / n;
    const rr = (a * (1 - e * e)) / (1 + e * Math.cos(nu));
    pts.push(new THREE.Vector3(rr * Math.cos(nu), 0, rr * Math.sin(nu)));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineDashedMaterial({
    color,
    transparent: true,
    opacity,
    dashSize: 7,
    gapSize: 4,
  });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  return line;
}

function scanlines() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 8;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0)';
  g.fillRect(0, 0, 4, 8);
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(0, 0, 4, 1);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 96);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(1920, 768),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.04, depthWrite: false }),
  );
}
