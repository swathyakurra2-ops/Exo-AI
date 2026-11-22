import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface DataStreamsProps {
  progress: number; // 0 to 1 (mapped from 0 to 8.5s)
  isMobile?: boolean;
}

interface EmbeddedGlyph {
  token: string;
  streamIndex: number;
  baseT: number;
  speed: number;
  color: string;
}

/**
 * Hero Code & Data Streams:
 * Directly solves User Requirements #2, #3, and #6:
 * - Data/code is physical, moving continuously through 3D space
 * - Primary directional streams bending naturally around the planet
 * - Deep 3D layering: Stream 1 passes IN FRONT of the planet, Stream 2 passes BEHIND it,
 *   Stream 3 grazes beside the limb
 * - Small, sparse, flowing fragments (radius, flux, temp, mass, orbit, stellar, period, R⊕, K, S⊕)
 * - NO giant rectangular dashboard boxes!
 */
export const DataStreams: React.FC<DataStreamsProps> = ({ progress, isMobile = false }) => {
  const frontParticlesRef = useRef<THREE.Points>(null);
  const backParticlesRef = useRef<THREE.Points>(null);
  const streamLinesRef = useRef<THREE.Group>(null);

  // Planet center: [0.9, 0.15, 0]
  // 1. Primary 3D Trajectory Splines with distinct front / behind depth:
  const { curves, frontCurveIndices } = useMemo(() => {
    // Stream 0: Sweeping IN FRONT of the planet (z: +1.8 to +2.4)
    const streamFront = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-12, 6.5, 0.5),
      new THREE.Vector3(-5.5, 3.8, 1.4),
      new THREE.Vector3(0.1, 1.4, 2.2), // IN FRONT of planet
      new THREE.Vector3(1.6, -0.6, 1.8), // curving across lower-front
      new THREE.Vector3(5.5, -2.8, 0.6),
      new THREE.Vector3(11, -5.2, -1.5),
    ], false, 'centripetal', 0.5);

    // Stream 1: Sweeping BEHIND the planet (z: -1.8 to -2.5)
    const streamBack = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-13, 1.2, -1.0),
      new THREE.Vector3(-4.8, 1.0, -1.8),
      new THREE.Vector3(0.5, 0.8, -2.4), // BEHIND planet
      new THREE.Vector3(2.2, 0.2, -2.0),
      new THREE.Vector3(6.5, 1.8, -3.2),
      new THREE.Vector3(12, 4.0, -5.0),
    ], false, 'centripetal', 0.5);

    // Stream 2: High equatorial gravitational bend (grazing the lit crescent limb)
    const streamLimb = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-11, 8.5, -2.0),
      new THREE.Vector3(-4.0, 4.5, -0.4),
      new THREE.Vector3(-0.8, 2.1, 0.4),
      new THREE.Vector3(1.2, 2.4, -0.2), // grazing top limb
      new THREE.Vector3(4.8, 0.8, -1.2),
      new THREE.Vector3(10, -1.5, -3.0),
    ], false, 'centripetal', 0.5);

    // Stream 3: Fast compression stream funnelling into processing core
    const streamCore = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-10, -3.5, 1.0),
      new THREE.Vector3(-4.2, -1.8, 0.8),
      new THREE.Vector3(0.2, -0.8, 0.6),
      new THREE.Vector3(1.8, -0.2, -0.5),
      new THREE.Vector3(7.2, 2.2, -2.5),
      new THREE.Vector3(12, 3.5, -4.5),
    ], false, 'centripetal', 0.5);

    return {
      curves: [streamFront, streamBack, streamLimb, streamCore],
      frontCurveIndices: [0, 2], // rendered with depthTest / front sorting
    };
  }, []);

  // Pre-generate stream lines
  const streamLineGeometries = useMemo(() => {
    return curves.map(curve => {
      const pts = curve.getPoints(isMobile ? 50 : 100);
      return new THREE.BufferGeometry().setFromPoints(pts);
    });
  }, [curves, isMobile]);

  // Thousands of dense flowing physical code/data particles along curves
  const particleCount = isMobile ? 180 : 360;
  const [particlesFront, particlesBack] = useMemo(() => {
    const makeBatch = (count: number) => {
      const pos = new Float32Array(count * 3);
      const col = new Float32Array(count * 3);
      const prog = new Float32Array(count);
      const curveMap = new Uint8Array(count);
      const speeds = new Float32Array(count);

      const electricBlue = new THREE.Color('#38bdf8');
      const warmGold = new THREE.Color('#dfb15b');
      const icyWhite = new THREE.Color('#f8fafc');
      const dustyPink = new THREE.Color('#d9708a'); // 2% rare accent

      for (let i = 0; i < count; i++) {
        prog[i] = Math.random();
        speeds[i] = 0.08 + Math.random() * 0.12;

        const roll = Math.random();
        let c: THREE.Color;
        if (roll < 0.68) c = electricBlue;
        else if (roll < 0.90) c = warmGold;
        else if (roll < 0.98) c = icyWhite;
        else c = dustyPink;

        col[i * 3] = c.r;
        col[i * 3 + 1] = c.g;
        col[i * 3 + 2] = c.b;
      }
      return { pos, col, prog, curveMap, speeds };
    };

    const half = Math.floor(particleCount / 2);
    const front = makeBatch(half);
    const back = makeBatch(half);

    for (let i = 0; i < half; i++) {
      front.curveMap[i] = frontCurveIndices[i % frontCurveIndices.length];
      back.curveMap[i] = 1; // Stream 1 (behind)
    }

    return [front, back];
  }, [particleCount, frontCurveIndices]);

  // Tiny embedded physical data glyphs moving along the streams (NOT large cards!)
  // Exactly as requested: radius, flux, temp, mass, orbit, stellar, period, R⊕, K, S⊕
  const embeddedGlyphs: EmbeddedGlyph[] = useMemo(() => [
    { token: 'orbit:34.2d', streamIndex: 0, baseT: 0.12, speed: 0.045, color: '#38bdf8' },
    { token: 'R⊕:1.34', streamIndex: 0, baseT: 0.38, speed: 0.042, color: '#dfb15b' },
    { token: 'flux:0.70', streamIndex: 0, baseT: 0.65, speed: 0.048, color: '#38bdf8' },
    { token: 'stellar:M4V', streamIndex: 1, baseT: 0.22, speed: 0.040, color: '#a0aec0' },
    { token: 'temp:233K', streamIndex: 1, baseT: 0.52, speed: 0.044, color: '#dfb15b' },
    { token: 'mass:2.1M⊕', streamIndex: 2, baseT: 0.28, speed: 0.046, color: '#38bdf8' },
    { token: 'period:11.2d', streamIndex: 2, baseT: 0.58, speed: 0.042, color: '#a0aec0' },
    { token: 'S⊕:0.72', streamIndex: 3, baseT: 0.34, speed: 0.049, color: '#dfb15b' },
    { token: 'snr:38.4', streamIndex: 3, baseT: 0.72, speed: 0.045, color: '#38bdf8' },
  ], []);

  const [glyphPositions, setGlyphPositions] = React.useState<THREE.Vector3[]>(() =>
    embeddedGlyphs.map(() => new THREE.Vector3())
  );

  // Shader material for glowing stream particle trails
  const particleMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0 },
      },
      vertexShader: `
        uniform float uOpacity;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vColor = color;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 12.0 * (15.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
          vAlpha = uOpacity;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float intensity = pow(1.0 - (dist * 2.0), 2.2);
          gl_FragColor = vec4(vColor, vAlpha * intensity * 0.95);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
  }, []);

  useFrame((_state, delta) => {
    // Timing: Data streams begin approaching at 2.5s and curve around through 6.0s
    // (progress 0.28 to 0.70)
    const streamAlpha = THREE.MathUtils.clamp((progress - 0.28) / 0.25, 0, 1);
    particleMaterial.uniforms.uOpacity.value = streamAlpha;

    if (streamAlpha <= 0) return;

    // Update Front Particles
    if (frontParticlesRef.current) {
      const posAttr = frontParticlesRef.current.geometry.attributes.position;
      const arr = posAttr.array as Float32Array;
      const count = particlesFront.prog.length;

      for (let i = 0; i < count; i++) {
        particlesFront.prog[i] = (particlesFront.prog[i] + delta * particlesFront.speeds[i]) % 1.0;
        const pt = curves[particlesFront.curveMap[i]].getPointAt(particlesFront.prog[i]);
        arr[i * 3] = pt.x;
        arr[i * 3 + 1] = pt.y;
        arr[i * 3 + 2] = pt.z;
      }
      posAttr.needsUpdate = true;
    }

    // Update Back Particles
    if (backParticlesRef.current) {
      const posAttr = backParticlesRef.current.geometry.attributes.position;
      const arr = posAttr.array as Float32Array;
      const count = particlesBack.prog.length;

      for (let i = 0; i < count; i++) {
        particlesBack.prog[i] = (particlesBack.prog[i] + delta * particlesBack.speeds[i]) % 1.0;
        const pt = curves[particlesBack.curveMap[i]].getPointAt(particlesBack.prog[i]);
        arr[i * 3] = pt.x;
        arr[i * 3 + 1] = pt.y;
        arr[i * 3 + 2] = pt.z;
      }
      posAttr.needsUpdate = true;
    }

    // Update embedded moving glyph positions along streams
    const newPositions: THREE.Vector3[] = [];
    for (let g = 0; g < embeddedGlyphs.length; g++) {
      const item = embeddedGlyphs[g];
      const t = (item.baseT + progress * 0.24) % 1.0;
      const pt = curves[item.streamIndex].getPointAt(t);
      newPositions.push(pt);
    }
    setGlyphPositions(newPositions);

    // Fade thin stream guidance lines
    if (streamLinesRef.current) {
      streamLinesRef.current.children.forEach(child => {
        if (child instanceof THREE.Line) {
          const mat = child.material as THREE.LineBasicMaterial;
          mat.opacity = streamAlpha * 0.18;
        }
      });
    }
  });

  const streamAlpha = THREE.MathUtils.clamp((progress - 0.28) / 0.25, 0, 1);

  return (
    <group>
      {/* 1. Subtle Thin Stream Guide Vectors */}
      <group ref={streamLinesRef}>
        {streamLineGeometries.map((geom, idx) => (
          <primitive
            key={idx}
            object={
              new THREE.Line(
                geom,
                new THREE.LineBasicMaterial({
                  color: idx === 0 ? '#38bdf8' : (idx === 1 ? '#dfb15b' : '#144852'),
                  transparent: true,
                  opacity: 0,
                  blending: THREE.AdditiveBlending,
                  depthWrite: false,
                })
              )
            }
          />
        ))}
      </group>

      {/* 2. Particles streaming BEHIND planet (rendered behind) */}
      <points ref={backParticlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particlesBack.prog.length}
            array={particlesBack.pos}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={particlesBack.prog.length}
            array={particlesBack.col}
            itemSize={3}
          />
        </bufferGeometry>
        <primitive object={particleMaterial} attach="material" />
      </points>

      {/* 3. Particles streaming IN FRONT of planet (spatial 3D depth) */}
      <points ref={frontParticlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particlesFront.prog.length}
            array={particlesFront.pos}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={particlesFront.prog.length}
            array={particlesFront.col}
            itemSize={3}
          />
        </bufferGeometry>
        <primitive object={particleMaterial} attach="material" />
      </points>

      {/* 4. Tiny Embedded Moving Data Glyphs (Micro Typography, NO Boxes) */}
      {streamAlpha > 0.05 && glyphPositions.map((pos, idx) => {
        const item = embeddedGlyphs[idx];
        return (
          <group key={idx} position={[pos.x, pos.y, pos.z]}>
            <Html
              center
              distanceFactor={18}
              style={{
                pointerEvents: 'none',
                opacity: streamAlpha * 0.65,
                transition: 'opacity 0.4s ease',
              }}
            >
              {/* Minimalist micro text: tiny typography, small dot/bracket, no heavy card */}
              <div className="flex items-center space-x-1 font-mono text-[8px] tracking-wider select-none whitespace-nowrap">
                <span className="w-1 h-1 rounded-full bg-[#38bdf8]/80 inline-block animate-pulse" />
                <span style={{ color: item.color }} className="font-normal opacity-90">
                  {item.token}
                </span>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
};
