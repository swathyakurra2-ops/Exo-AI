import React, { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { StarField } from './StarField';
import { Planet } from './Planet';
import { DataStreams } from './DataStreams';
import { DataParticles } from './DataParticles';
import { CodeFunnel } from './CodeFunnel';
import { CelestialArcs } from './CelestialArcs';
import { AlienCraterLandscape } from './AlienCraterLandscape';

interface IntroSceneProps {
  progress: number; // 0 to 1 representing 0.0s to 5.5s timeline
  isMobile: boolean;
  reducedMotion?: boolean;
}

// Internal rig for extremely subtle cinematic camera drift and responsive parallax
const CameraRig: React.FC<{ reducedMotion?: boolean }> = ({ reducedMotion }) => {
  const { camera, pointer } = useThree();
  const initialZ = 8.5;

  useFrame((state) => {
    if (reducedMotion) return;

    // Target very subtle camera parallax based on cursor/touch (-0.35 to +0.35)
    const targetX = pointer.x * 0.45;
    const targetY = pointer.y * 0.25;

    // Subtle continuous cosmic breathing motion
    const t = state.clock.getElapsedTime();
    const breathingZ = initialZ + Math.sin(t * 0.15) * 0.08;

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.035);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.035);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, breathingZ, 0.02);

    camera.lookAt(0, 0, 0);
  });

  return null;
};

export const IntroScene: React.FC<IntroSceneProps> = ({
  progress,
  isMobile,
  reducedMotion = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full bg-[#050608] overflow-hidden select-none pointer-events-auto"
    >
      <Canvas
        camera={{ position: [0, 0, 8.5], fov: 42, near: 0.1, far: 250 }}
        dpr={typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
      >
        <color attach="background" args={['#050608']} />

        {/* Lighting setup: Distant host star casting dramatic planetary contrast */}
        <directionalLight
          position={[-12, 5, 8]}
          intensity={2.8}
          color="#fbf8eb" // subtle warm stellar radiation
        />
        
        {/* Subtle deep cosmic blue fill ambient light */}
        <ambientLight intensity={0.16} color="#0c1e38" />

        {/* Faint rim backlight to delineate dark limb */}
        <directionalLight
          position={[10, -4, -6]}
          intensity={0.45}
          color="#144852" // dark atmospheric teal
        />

        {/* Camera Drift and Parallax */}
        <CameraRig reducedMotion={reducedMotion} />

        {/* 1. Deep Space Star Field */}
        <StarField progress={progress} count={isMobile ? 900 : 2000} />

        {/* 2. Sweeping Celestial Particle Arcs (Reference 2) */}
        <CelestialArcs progress={progress} isMobile={isMobile} />

        {/* 3. Alien Crater Horizon Landscape with reflective mineral ridges (Reference 2) */}
        <AlienCraterLandscape progress={progress} />

        {/* 4. Warped Perspective Code Funnel Streaming Into Horizon (Reference 1) */}
        <CodeFunnel progress={progress} isMobile={isMobile} />

        {/* 5. Central 3D Exoplanetary Sphere with Accretion Photon Ring (Reference 1 & 2) */}
        <Planet progress={progress} isMobile={isMobile} />

        {/* 6. Raw Vector Stream Splines & Telemetry Packets (CODE → PLANET) */}
        <DataStreams progress={progress} isMobile={isMobile} />

        {/* 7. Structured Output Particles (PLANET → UNDERSTANDING) */}
        <DataParticles progress={progress} isMobile={isMobile} />
      </Canvas>
    </div>
  );
};
