import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AlienCraterLandscapeProps {
  progress: number;
}

/**
 * Procedural Alien Crater Horizon:
 * Inspired directly by Reference 2 (alien/crater landscape beneath an enormous star field)
 * with deep black basalt ridges, crater crests, and specular highlights reflecting
 * the celestial gold and electric blue starlight.
 */
export const AlienCraterLandscape: React.FC<AlienCraterLandscapeProps> = ({ progress }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Generate rocky cratered terrain geometry
  const terrainGeometry = useMemo(() => {
    const width = 36;
    const depth = 20;
    const segX = 80;
    const segY = 50;

    const geom = new THREE.PlaneGeometry(width, depth, segX, segY);
    geom.rotateX(-Math.PI * 0.46); // tilted slightly towards camera

    const pos = geom.attributes.position;
    const count = pos.count;

    // Multi-frequency craggy crater noise
    for (let i = 0; i < count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      // Low frequency rolling mountain ridges
      const f1 = Math.sin(x * 0.28) * Math.cos(z * 0.35) * 0.8;
      // Mid frequency crag ridges
      const f2 = Math.sin(x * 0.7 + z * 0.6) * 0.35 + Math.cos(x * 1.2 - z * 0.8) * 0.2;
      // High frequency mineral texture
      const f3 = Math.sin(x * 3.1) * Math.sin(z * 2.8) * 0.08;

      // Distance falloff towards horizon so background mountains rise smoothly
      const depthFactor = THREE.MathUtils.smoothstep(z, -6, 8);
      const elevation = (f1 + f2 + f3) * (0.6 + depthFactor * 0.6);

      pos.setY(i, y + elevation);
    }

    geom.computeVertexNormals();
    return geom;
  }, []);

  // Custom terrain shader with starlight reflections (deep cosmic blue & celestial gold)
  const terrainMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying vec2 vUv;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying vec2 vUv;

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);

          // Deep basalt base surface: #0a0d12
          vec3 basalt = vec3(0.04, 0.05, 0.07);

          // Specular glancing reflections of celestial light from above
          float celestialReflect = pow(max(dot(reflect(-viewDir, normal), vec3(0.0, 1.0, 0.3)), 0.0), 12.0);

          // Dual color highlights: muted celestial gold along ridges, electric blue in mineral channels
          vec3 goldHighlight = vec3(0.87, 0.69, 0.36) * celestialReflect * 0.8;
          vec3 blueHighlight = vec3(0.22, 0.74, 0.97) * pow(celestialReflect, 1.8) * 0.6;

          // Atmospheric teal rim haze along distant horizon
          float horizonDist = smoothstep(2.0, -10.0, vWorldPosition.z);
          vec3 atmosphericTeal = vec3(0.05, 0.17, 0.20) * (1.0 - horizonDist) * 0.4;

          vec3 finalColor = basalt + goldHighlight + blueHighlight + atmosphericTeal;

          // Fade out towards edges and bottom to blend seamlessly into #050608
          float edgeFade = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x);
          edgeFade *= smoothstep(0.0, 0.35, vUv.y);

          gl_FragColor = vec4(finalColor, edgeFade * uOpacity * 0.75);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
  }, []);

  useFrame((state) => {
    // Landscape becomes softly visible around 2.0s to 4.0s
    const alpha = THREE.MathUtils.clamp((progress - 0.22) / 0.35, 0, 0.65);
    terrainMaterial.uniforms.uOpacity.value = alpha;
    terrainMaterial.uniforms.uTime.value = state.clock.getElapsedTime();
  });

  return (
    <mesh
      ref={meshRef}
      geometry={terrainGeometry}
      material={terrainMaterial}
      position={[0, -3.9, 1.5]}
    />
  );
};
