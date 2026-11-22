import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface StarFieldProps {
  progress: number; // 0.0 to 1.0 (mapped from 0 to 8.5s)
  count?: number;
}

export const StarField: React.FC<StarFieldProps> = ({ progress, count = 2200 }) => {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate multi-depth star positions, colors, and scales with realistic cosmic distribution
  const [positions, colors, sizes, phases] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const ph = new Float32Array(count);

    // Color distribution specified:
    // ~70% cool/deep blue, ~20% warm gold, ~8% icy white, ~2% rare dusty pink/rose
    const coolBlues = [
      new THREE.Color('#10223b'),
      new THREE.Color('#1e3a5f'),
      new THREE.Color('#38bdf8'),
      new THREE.Color('#60a5fa'),
      new THREE.Color('#0e2f38'),
    ];
    const warmGolds = [
      new THREE.Color('#dfb15b'),
      new THREE.Color('#c99d45'),
      new THREE.Color('#f3e1b6'),
    ];
    const icyWhites = [
      new THREE.Color('#f8fafc'),
      new THREE.Color('#e2e8f0'),
    ];
    const dustyPinks = [
      new THREE.Color('#d9708a'),
      new THREE.Color('#c95e7b'),
      new THREE.Color('#e2829b'),
    ];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // 3 Layers: 70% far background, 25% midground, 5% foreground
      const layerRand = Math.random();
      let radius: number;
      let sizeBase: number;

      if (layerRand < 0.70) {
        // Far background: deep, tiny, dim
        radius = 35 + Math.random() * 85;
        sizeBase = 0.8 + Math.random() * 1.2;
      } else if (layerRand < 0.95) {
        // Midground
        radius = 15 + Math.random() * 30;
        sizeBase = 1.4 + Math.random() * 2.0;
      } else {
        // Foreground: occasional brighter particle
        radius = 8 + Math.random() * 12;
        sizeBase = 2.4 + Math.random() * 2.6;
      }

      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.85;

      pos[i3] = radius * Math.cos(phi) * Math.sin(theta);
      pos[i3 + 1] = radius * Math.sin(phi);
      pos[i3 + 2] = radius * Math.cos(phi) * Math.cos(theta) - 15;

      // Exact color weighting:
      // 70% blue, 20% gold, 8% white, 2% dusty rose
      const colorRoll = Math.random();
      let starColor: THREE.Color;

      if (colorRoll < 0.70) {
        starColor = coolBlues[Math.floor(Math.random() * coolBlues.length)];
      } else if (colorRoll < 0.90) {
        starColor = warmGolds[Math.floor(Math.random() * warmGolds.length)];
      } else if (colorRoll < 0.98) {
        starColor = icyWhites[Math.floor(Math.random() * icyWhites.length)];
      } else {
        // Rare 2% dusty pink / cosmic rose star
        starColor = dustyPinks[Math.floor(Math.random() * dustyPinks.length)];
      }

      col[i3] = starColor.r;
      col[i3 + 1] = starColor.g;
      col[i3 + 2] = starColor.b;

      sz[i] = sizeBase;
      ph[i] = Math.random() * Math.PI * 2;
    }

    return [pos, col, sz, ph];
  }, [count]);

  const starShader = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uOpacity;
        attribute float aSize;
        attribute float aPhase;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          
          // Organic celestial shimmer
          float twinkle = sin(uTime * 1.2 + aPhase) * 0.25 + 0.75;
          vAlpha = uOpacity * twinkle;
          
          gl_PointSize = aSize * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          // Gaussian soft core
          float intensity = smoothstep(0.5, 0.0, dist);
          intensity = pow(intensity, 1.5);
          
          gl_FragColor = vec4(vColor, vAlpha * intensity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const time = state.clock.getElapsedTime();

    // Very subtle micro drift
    pointsRef.current.rotation.y = time * 0.003;
    pointsRef.current.rotation.x = Math.sin(time * 0.0015) * 0.008;

    // Stars gradually appear from 0.0 to 1.5s (progress ~ 0.0 to 0.18)
    const starOpacity = THREE.MathUtils.clamp(progress / 0.18, 0, 0.95);
    starShader.uniforms.uOpacity.value = starOpacity;
    starShader.uniforms.uTime.value = time;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aPhase"
          count={phases.length}
          array={phases}
          itemSize={1}
        />
      </bufferGeometry>
      <primitive object={starShader} attach="material" />
    </points>
  );
};
