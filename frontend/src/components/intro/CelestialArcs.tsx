import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CelestialArcsProps {
  progress: number;
  isMobile?: boolean;
}

/**
 * Sweeping Celestial Particle Arcs:
 * Directly inspired by Reference 2 (the sweeping rings of gold and blue stars
 * spanning across deep black space above the planetary silhouette).
 */
export const CelestialArcs: React.FC<CelestialArcsProps> = ({ progress, isMobile = false }) => {
  const pointsRef = useRef<THREE.Points>(null);

  const count = isMobile ? 600 : 1400;

  const [positions, colors, sizes, phases] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const ph = new Float32Array(count);

    const goldColor = new THREE.Color('#dfb15b');
    const paleGold = new THREE.Color('#f5eedb');
    const blueColor = new THREE.Color('#38bdf8');
    const deepBlue = new THREE.Color('#1e3a5f');

    // 2 grand sweeping orbital arcs spanning the upper sky
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const arcIdx = i % 2; // two distinct concentric sweeping arcs
      const t = (i / (count / 2)) * Math.PI * 0.95 - 0.2; // along arc angle

      const baseRadius = arcIdx === 0 ? 12.0 : 15.5;
      const spread = (Math.random() - 0.5) * (arcIdx === 0 ? 0.9 : 1.4);
      const r = baseRadius + spread;

      // Parabolic / elliptical sweep across the sky
      const x = Math.cos(t) * r * 1.1 - 2.0;
      const y = Math.sin(t) * r * 0.65 + 3.0 + (Math.random() - 0.5) * 0.5;
      const z = -6.0 - Math.sin(t) * 5.0 + (Math.random() - 0.5) * 1.5;

      pos[i3] = x;
      pos[i3 + 1] = y;
      pos[i3 + 2] = z;

      // Color distribution: mostly celestial gold dust with interspersed electric and deep star blue
      const rand = Math.random();
      let c: THREE.Color;
      if (rand < 0.5) {
        c = goldColor;
      } else if (rand < 0.75) {
        c = paleGold;
      } else if (rand < 0.9) {
        c = blueColor;
      } else {
        c = deepBlue;
      }

      col[i3] = c.r;
      col[i3 + 1] = c.g;
      col[i3 + 2] = c.b;

      sz[i] = 1.2 + Math.random() * 2.8;
      ph[i] = Math.random() * Math.PI * 2;
    }

    return [pos, col, sz, ph];
  }, [count]);

  const arcShader = useMemo(() => {
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
          
          float shimmer = sin(uTime * 1.8 + aPhase) * 0.2 + 0.8;
          vAlpha = uOpacity * shimmer;

          gl_PointSize = aSize * (180.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float intensity = smoothstep(0.5, 0.0, dist);
          gl_FragColor = vec4(vColor, vAlpha * intensity * 0.85);
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

    // Very gentle orbital drift
    pointsRef.current.rotation.z = Math.sin(time * 0.02) * 0.015;

    // Fades in with stars around 0.6s
    const alpha = THREE.MathUtils.clamp((progress - 0.1) / 0.25, 0, 0.9);
    arcShader.uniforms.uOpacity.value = alpha;
    arcShader.uniforms.uTime.value = time;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={count}
          array={sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aPhase"
          count={count}
          array={phases}
          itemSize={1}
        />
      </bufferGeometry>
      <primitive object={arcShader} attach="material" />
    </points>
  );
};
