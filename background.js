// Starfield background adapted from celestial-zen (github.com/chiantera/celestial-zen).
// Each page load picks a random hue and flow speed.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.172.0/build/three.module.js';

const HUE = Math.floor(Math.random() * 360);
const SPEED = 0.3 + Math.random() * 1.5; // celestial-zen's slider spans 0.1–2
const COUNT = window.innerWidth < 700 ? 8000 : 20000;
const RADIUS = 15;
const CAMERA_Z = 15;

document.documentElement.style.setProperty('--hue', HUE);

function circleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.8)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.3)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function start() {
  const canvas = document.getElementById('stars');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = CAMERA_Z;

  const positions = new Float32Array(COUNT * 3);
  const velocities = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const color = new THREE.Color(`hsl(${HUE}, 70%, 60%)`);

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    const r = Math.sqrt(Math.random()) * RADIUS;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = r * Math.cos(phi);
    for (let k = 0; k < 3; k++) velocities[i3 + k] = (Math.random() - 0.5) * 0.01;
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    map: circleTexture(),
    alphaTest: 0.01,
  }));
  scene.add(points);

  const mouse = new THREE.Vector2();
  const target = new THREE.Vector2();
  window.addEventListener('pointermove', (e) => {
    target.x = (e.clientX / window.innerWidth) * 2 - 1;
    target.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function step() {
    mouse.x += (target.x - mouse.x) * 0.05;
    mouse.y += (target.y - mouse.y) * 0.05;

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      positions[i3] += velocities[i3] * SPEED;
      positions[i3 + 1] += velocities[i3 + 1] * SPEED;
      positions[i3 + 2] += velocities[i3 + 2] * SPEED;

      // Stars near the cursor drift away from it.
      const dx = positions[i3] - mouse.x * 10;
      const dy = positions[i3 + 1] - mouse.y * 10;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 3) {
        const force = (3 - dist) / 30;
        positions[i3] += dx * force;
        positions[i3 + 1] += dy * force;
      }

      const r = Math.hypot(positions[i3], positions[i3 + 1], positions[i3 + 2]);
      if (r > RADIUS) {
        positions[i3] *= 0.95;
        positions[i3 + 1] *= 0.95;
        positions[i3 + 2] *= 0.95;
      }
    }
    geometry.attributes.position.needsUpdate = true;

    points.rotation.y += 0.002 * SPEED;
    points.rotation.x += 0.001 * SPEED;
    renderer.render(scene, camera);
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    step();
    return;
  }
  renderer.setAnimationLoop(step);
}

try {
  start();
} catch {
  // No WebGL: the page keeps its plain dark background.
}
