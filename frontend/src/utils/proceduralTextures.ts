import * as THREE from 'three';

/**
 * Generates procedural textures for the exoplanetary body:
 * Inspired by cratered landscapes and alien crusts with deep basalt,
 * mineral veins, and atmospheric scattering.
 */
export function createExoplanetTextures() {
  const width = 2048;
  const height = 1024;

  // 1. Diffuse / Color Map
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return {
      diffuseTexture: new THREE.Texture(),
      bumpTexture: new THREE.Texture(),
      roughnessTexture: new THREE.Texture()
    };
  }

  // Base dark planetary crust: #0D1014 and deep basalt tones
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0a0d12');
  gradient.addColorStop(0.3, '#0e141d');
  gradient.addColorStop(0.6, '#080a0e');
  gradient.addColorStop(1, '#0e1218');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Multi-octave Perlin-like cellular noise & crater simulation
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Pre-seed pseudo random crater centers
  const craters: { x: number; y: number; r: number; depth: number }[] = [];
  const numCraters = 42;
  let seed = 42;
  function random() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  for (let i = 0; i < numCraters; i++) {
    craters.push({
      x: random() * width,
      y: random() * height,
      r: 8 + random() * 65,
      depth: 0.3 + random() * 0.7
    });
  }

  // Generate terrain and crater elevations
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Base cellular mineral variance
      const nx = x / 60.0;
      const ny = y / 60.0;
      const wave = Math.sin(nx) * Math.cos(ny) * 0.5 + Math.sin(nx * 2.3 + ny * 1.7) * 0.25;
      
      let elevation = 0.5 + wave * 0.15;

      // Compute crater impacts with ejecta rings
      for (let c = 0; c < craters.length; c++) {
        const crater = craters[c];
        const dx = Math.abs(x - crater.x);
        const dy = Math.abs(y - crater.y);
        // wrap around longitude
        const wrapDx = Math.min(dx, width - dx);
        const dist = Math.sqrt(wrapDx * wrapDx + dy * dy);

        if (dist < crater.r * 1.5) {
          const normDist = dist / crater.r;
          if (normDist < 1.0) {
            // Inside crater bowl
            const bowl = Math.cos(normDist * Math.PI * 0.5);
            elevation -= bowl * 0.28 * crater.depth;
          } else {
            // Elevated crater rim / ejecta
            const rim = Math.sin((normDist - 1.0) * Math.PI * 2.0);
            if (rim > 0) {
              elevation += rim * 0.12 * crater.depth;
            }
          }
        }
      }

      elevation = Math.max(0, Math.min(1, elevation));

      // Color mapping: deep basalt (#0c1017) to mineral ridges (#1a2536) to subtle gold veins (#2e2a1e)
      const baseR = 12 + elevation * 18 + (wave > 0.3 ? 15 : 0);
      const baseG = 16 + elevation * 24 + (wave > 0.3 ? 12 : 0);
      const baseB = 22 + elevation * 38;

      data[idx] = Math.min(255, baseR);
      data[idx + 1] = Math.min(255, baseG);
      data[idx + 2] = Math.min(255, baseB);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Subtle atmospheric dust overlay
  ctx.fillStyle = 'rgba(12, 43, 51, 0.08)'; // atmospheric teal hint
  ctx.fillRect(0, 0, width, height);

  const diffuseTexture = new THREE.CanvasTexture(canvas);
  diffuseTexture.wrapS = THREE.RepeatWrapping;
  diffuseTexture.wrapT = THREE.ClampToEdgeWrapping;

  // 2. Bump / Normal Texture
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bCtx = bumpCanvas.getContext('2d');
  if (bCtx) {
    bCtx.drawImage(canvas, 0, 0);
  }
  const bumpTexture = new THREE.CanvasTexture(bumpCanvas);
  bumpTexture.wrapS = THREE.RepeatWrapping;
  bumpTexture.wrapT = THREE.ClampToEdgeWrapping;

  // 3. Roughness Texture (rocky craters are matte, smooth lowlands have slight sheen)
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = width;
  roughCanvas.height = height;
  const rCtx = roughCanvas.getContext('2d');
  if (rCtx) {
    rCtx.fillStyle = '#b0b8c4'; // mostly matte
    rCtx.fillRect(0, 0, width, height);
    rCtx.drawImage(canvas, 0, 0);
  }
  const roughnessTexture = new THREE.CanvasTexture(roughCanvas);
  roughnessTexture.wrapS = THREE.RepeatWrapping;

  return { diffuseTexture, bumpTexture, roughnessTexture };
}
