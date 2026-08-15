import * as THREE from 'three';

function starField(count, radius) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = radius * Math.cos(phi);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false });
  return new THREE.Points(geo, mat);
}

function fresnelAtmosphere(color, scale) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { glowColor: { value: new THREE.Color(color) } },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorld;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 w = modelViewMatrix * vec4(position, 1.0);
        vWorld = normalize(-w.xyz);
        gl_Position = projectionMatrix * w;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      varying vec3 vNormal;
      varying vec3 vWorld;
      void main() {
        float f = pow(1.0 - abs(dot(vNormal, vWorld)), 2.6);
        gl_FragColor = vec4(glowColor, f * 0.85);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), mat);
  mesh.scale.setScalar(scale);
  return mesh;
}

export function buildSpace(tex) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.add(starField(7000, 40000));

  const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
  sun.position.set(8000, 2000, 4000);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x334466, 0.25));

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(1600, 64, 48),
    new THREE.MeshStandardMaterial({ map: tex.earth, roughness: 0.9, metalness: 0 }),
  );
  earth.position.set(2600, -1700, -400);
  scene.add(earth);
  const earthAtmo = fresnelAtmosphere(0x4d8cff, 1680);
  earth.add(earthAtmo);

  const mars = new THREE.Mesh(
    new THREE.SphereGeometry(850, 64, 48),
    new THREE.MeshStandardMaterial({ map: tex.mars, roughness: 0.95, metalness: 0 }),
  );
  mars.position.set(24000, -200, 1800);
  scene.add(mars);
  const marsAtmo = fresnelAtmosphere(0xd9a38a, 890);
  mars.add(marsAtmo);

  const sunBody = new THREE.Mesh(
    new THREE.SphereGeometry(220, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff1c2 }),
  );
  sunBody.position.copy(sun.position).setLength(18000);
  scene.add(sunBody);

  return {
    scene,
    earth,
    mars,
    sun,
    reset() {
      earth.visible = true;
      earth.position.set(2600, -1700, -400);
      earth.scale.setScalar(1);
      mars.position.set(24000, -200, 1800);
      mars.scale.setScalar(1);
    },
    setTransit(u) {
      earth.visible = true;
      earth.position.set(2600 + u * 9000, -1700 + u * 500, -400);
      earth.scale.setScalar(1 - u * 0.78);
      mars.position.set(24000 * (1 - u) + 1600, -200 + (1 - u) * 80, 1800 * (1 - u));
      mars.scale.setScalar(0.5 + u * 1.35);
    },
    setApproach(u) {
      earth.visible = u < 0.12;
      mars.position.set(1400 - u * 500, -650 + u * 380, 80);
      mars.scale.setScalar(1.5 + u * 3.8);
    },
  };
}
