import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface DataParticlesProps {
  progress: number; // 0 to 1
  isMobile?: boolean;
}

interface SubtleTelemetryPoint {
  prefix: string;
  value: string;
  label: string;
  position: [number, number, number];
  color: string;
  fadeIn: number;
  fadeOut: number;
}

/**
 * Secondary Scientific Telemetry & Emerging Crystalline Particles:
 * Strictly fulfills Requirements #4 and #5:
 * - NO giant rectangular cards or dashboard containers
 * - Metrics are reduced to 15-20% size (micro typography text-[8px])
 * - Uses thin guide lines, small dots, subtle brackets, and coordinate markers
 * - Positioned organically near the edges/lower-right, fading in and out organically
 */
export const DataParticles: React.FC<DataParticlesProps> = ({ progress, isMobile = false }) => {
  const pointsRef = useRef<THREE.Points>(null);

  // Emerging structured crystalline particle cloud (Planet -> Understanding)
  const count = isMobile ? 120 : 240;

  const [positions, targetPositions, colors, phases] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const target = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const ph = new Float32Array(count);

    const electricBlue = new THREE.Color('#38bdf8');
    const celestialGold = new THREE.Color('#dfb15b');
    const icyWhite = new THREE.Color('#f0f4f8');
    const dustyPink = new THREE.Color('#d9708a');

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Start position near planet's data horizon (centered around planet [0.9, 0.15, 0])
      pos[i3] = 1.8 + Math.random() * 1.6;
      pos[i3 + 1] = (Math.random() - 0.5) * 2.2 + 0.15;
      pos[i3 + 2] = (Math.random() - 0.5) * 1.8;

      // Target position forms a structured geometric matrix expanding toward lower-right
      const row = Math.floor(i / 16);
      const colIdx = i % 16;
      target[i3] = 3.6 + colIdx * 0.42 + (Math.random() - 0.5) * 0.15;
      target[i3 + 1] = (row - 7) * 0.32 - 1.2 + (Math.random() - 0.5) * 0.15;
      target[i3 + 2] = -1.0 + Math.sin(colIdx) * 0.6 + (Math.random() - 0.5) * 0.15;

      const r = Math.random();
      let c: THREE.Color;
      if (r < 0.65) c = electricBlue;
      else if (r < 0.88) c = celestialGold;
      else if (r < 0.98) c = icyWhite;
      else c = dustyPink;

      col[i3] = c.r;
      col[i3 + 1] = c.g;
      col[i3 + 2] = c.b;

      ph[i] = Math.random() * Math.PI * 2;
    }

    return [pos, target, col, ph];
  }, [count]);

  // Subtle, secondary telemetry points (15-20% size, organic placement near edges)
  const telemetryPoints: SubtleTelemetryPoint[] = useMemo(() => [
    {
      prefix: '+',
      value: '1.34 R⊕',
      label: 'RAD',
      position: [4.8, 1.6, -1.0],
      color: '#38bdf8',
      fadeIn: 0.55,
      fadeOut: 0.88,
    },
    {
      prefix: '+',
      value: '0.70 S⊕',
      label: 'FLUX',
      position: [6.2, 0.2, -1.8],
      color: '#dfb15b',
      fadeIn: 0.60,
      fadeOut: 0.92,
    },
    {
      prefix: '+',
      value: '233 K',
      label: 'T_EQ',
      position: [5.2, -1.8, -1.2],
      color: '#38bdf8',
      fadeIn: 0.64,
      fadeOut: 0.95,
    },
    {
      prefix: '+',
      value: '82.4',
      label: 'HAB_IDX',
      position: [6.8, -3.2, -2.4],
      color: '#dfb15b',
      fadeIn: 0.68,
      fadeOut: 0.98,
    },
  ], []);

  const particleShader = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uOpacity;
        attribute float aPhase;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vColor = color;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          float pulse = sin(uTime * 1.8 + aPhase) * 0.2 + 0.8;
          vAlpha = uOpacity * pulse;
          gl_PointSize = 10.0 * (15.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float intensity = smoothstep(0.5, 0.0, dist);
          gl_FragColor = vec4(vColor, vAlpha * intensity * 0.9);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
  }, []);

  useFrame((state) => {
    // Begins emerging at ~5.0s to 7.0s (progress 0.55 to 0.82)
    const emergenceAlpha = THREE.MathUtils.clamp((progress - 0.52) / 0.24, 0, 1);
    particleShader.uniforms.uOpacity.value = emergenceAlpha;
    particleShader.uniforms.uTime.value = state.clock.getElapsedTime();

    if (!pointsRef.current || emergenceAlpha <= 0) return;

    const posAttr = pointsRef.current.geometry.attributes.position;
    const currentPos = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const t = emergenceAlpha;
      currentPos[i3] = THREE.MathUtils.lerp(positions[i3], targetPositions[i3], t) + Math.sin(state.clock.getElapsedTime() + phases[i]) * 0.04;
      currentPos[i3 + 1] = THREE.MathUtils.lerp(positions[i3 + 1], targetPositions[i3 + 1], t) + Math.cos(state.clock.getElapsedTime() + phases[i]) * 0.04;
      currentPos[i3 + 2] = THREE.MathUtils.lerp(positions[i3 + 2], targetPositions[i3 + 2], t);
    }
    posAttr.needsUpdate = true;
  });

  return (
    <group>
      {/* 1. Crystalline Structured Point Cloud */}
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
            attach="attributes-aPhase"
            count={count}
            array={phases}
            itemSize={1}
          />
        </bufferGeometry>
        <primitive object={particleShader} attach="material" />
      </points>

      {/* 2. Secondary Subtle Scientific Telemetry (NO Boxes, 15-20% Size, Guide Lines) */}
      {telemetryPoints.map((item, idx) => {
        // Compute subtle organic fade in and fade out
        if (progress < item.fadeIn) return null;
        const fadeInProgress = Math.min((progress - item.fadeIn) / 0.12, 1);
        const fadeOutProgress = progress > item.fadeOut ? Math.max(0, 1 - (progress - item.fadeOut) / 0.08) : 1;
        const alpha = fadeInProgress * fadeOutProgress;

        if (alpha <= 0.01) return null;

        return (
          <group key={idx} position={item.position}>
            <Html
              center
              distanceFactor={18}
              style={{
                pointerEvents: 'none',
                opacity: alpha * 0.72,
                transition: 'opacity 0.3s ease',
              }}
            >
              {/* Ultra-compact scientific notation: thin line, dot, no box */}
              <div className="flex items-center space-x-1 font-mono text-[8px] tracking-widest select-none whitespace-nowrap">
                <span className="text-[#8c94a0]/60">{item.prefix}</span>
                <span className="text-[#e8eaed] font-medium">{item.value}</span>
                <span className="text-[#8c94a0]/50 text-[7px]">[{item.label}]</span>
                <span className="w-3 h-px bg-[#38bdf8]/30 ml-1 inline-block" />
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
};
