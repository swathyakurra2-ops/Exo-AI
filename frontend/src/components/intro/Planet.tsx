import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createExoplanetTextures } from '../../utils/proceduralTextures';

interface PlanetProps {
  progress: number; // 0 to 1
  isMobile?: boolean;
}

/**
 * 3D Exoplanetary Sphere with Saturn-Style Planetary Ring:
 * - Truly 3D spherical body with lit hemisphere vs shadow hemisphere
 * - Surface crater elevation and mineral topography
 * - Rayleigh atmospheric limb scattering
 * - Single elegant Saturn-style celestial gold planetary ring (#D8A83E)
 * - Flawless 3D depth: wraps BEHIND the planet at the top and IN FRONT at the bottom
 * - Realistic planetary shadow cast onto the ring
 * - Slow, subtle synchronized orbital rotation
 */
export const Planet: React.FC<PlanetProps> = ({ progress, isMobile = false }) => {
  const planetGroupRef = useRef<THREE.Group>(null);
  const surfaceMeshRef = useRef<THREE.Mesh>(null);
  const atmosphereMeshRef = useRef<THREE.Mesh>(null);
  const ringMeshRef = useRef<THREE.Mesh>(null);

  // Procedural high-res crater terrain, bump, and roughness maps
  const { diffuseTexture, bumpTexture } = useMemo(() => {
    return createExoplanetTextures();
  }, []);

  // 1. Physically-inspired custom planet surface shader
  const planetSurfaceShader = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uDiffuse: { value: diffuseTexture },
        uBump: { value: bumpTexture },
        uTime: { value: 0 },
        uLightDirection: { value: new THREE.Vector3(-1.0, 0.65, 0.75).normalize() },
        uSecondaryLight: { value: new THREE.Vector3(0.8, -0.4, -0.5).normalize() },
        uOpacity: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying vec3 vViewPosition;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPos.xyz;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform sampler2D uDiffuse;
        uniform sampler2D uBump;
        uniform float uTime;
        uniform vec3 uLightDirection;
        uniform vec3 uSecondaryLight;
        uniform float uOpacity;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying vec3 vViewPosition;

        void main() {
          vec3 N = normalize(vNormal);
          vec3 V = normalize(vViewPosition);
          vec3 L = normalize(uLightDirection);
          vec3 L2 = normalize(uSecondaryLight);

          // Sample terrain texture and bump
          vec4 texColor = texture2D(uDiffuse, vUv);
          float bump = texture2D(uBump, vUv).r;

          // Perturb normal with bump map for craggy surface relief
          vec3 perturbedN = normalize(N + vec3((bump - 0.5) * 0.12));

          // 1. Primary Stellar Key Light
          float NdotL = dot(perturbedN, L);
          float diffuseTerm = smoothstep(-0.15, 0.65, NdotL);

          // Surface tones
          vec3 darkBasalt = vec3(0.04, 0.05, 0.07);
          vec3 litSurface = texColor.rgb * vec3(1.2, 1.25, 1.4);
          litSurface += vec3(0.18, 0.14, 0.06) * pow(bump, 2.0);

          vec3 surfaceColor = mix(darkBasalt, litSurface, diffuseTerm);

          // 2. Specular reflection
          vec3 H = normalize(L + V);
          float spec = pow(max(dot(perturbedN, H), 0.0), 24.0) * diffuseTerm;
          surfaceColor += vec3(0.85, 0.72, 0.45) * spec * 0.4;

          // 3. Secondary subtle electric blue cosmic fill light
          float NdotL2 = max(dot(N, L2), 0.0);
          surfaceColor += vec3(0.04, 0.14, 0.22) * NdotL2 * 0.35;

          // 4. Subtle atmospheric limb scattering on lit edge
          float fresnel = 1.0 - max(dot(V, N), 0.0);
          float atmosphericLimb = pow(fresnel, 3.2) * (diffuseTerm * 0.8 + 0.2);
          vec3 atmosphericColor = mix(vec3(0.05, 0.18, 0.22), vec3(0.22, 0.74, 0.97), fresnel);
          surfaceColor += atmosphericColor * atmosphericLimb * 0.75;

          gl_FragColor = vec4(surfaceColor, uOpacity);
        }
      `,
      transparent: true,
      depthWrite: true,
    });
  }, [diffuseTexture, bumpTexture]);

  // 2. Atmospheric Outer Glow Layer
  const atmosphericHaloShader = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uLightDirection: { value: new THREE.Vector3(-1.0, 0.65, 0.75).normalize() },
        uOpacity: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPos.xyz;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uLightDirection;
        uniform float uOpacity;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          vec3 N = normalize(vNormal);
          vec3 V = normalize(vViewPosition);
          vec3 L = normalize(uLightDirection);

          float fresnel = 1.0 - max(dot(V, N), 0.0);
          fresnel = pow(fresnel, 3.8);

          float sunAlignment = max(dot(N, L), -0.2) + 0.2;
          float halo = fresnel * pow(sunAlignment, 1.8);

          vec3 haloColor = mix(vec3(0.05, 0.20, 0.24), vec3(0.22, 0.74, 0.97), fresnel);

          gl_FragColor = vec4(haloColor, halo * uOpacity * 0.85);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  // 3. Saturn-Style Planetary Ring Shader
  // Celestial gold (#D8A83E), softly luminous, thin core with outer glow,
  // passing behind and in front of the sphere with realistic planetary shadow.
  const ringInnerRadius = 2.75;
  const ringOuterRadius = 3.60;

  const saturnRingShader = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uInnerRadius: { value: ringInnerRadius },
        uOuterRadius: { value: ringOuterRadius },
        uLightDirection: { value: new THREE.Vector3(-1.0, 0.65, 0.75).normalize() },
        uOpacity: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vLocalPos;
        varying vec3 vWorldPos;
        varying float vRadius;

        void main() {
          vLocalPos = position;
          vRadius = length(position.xy);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uInnerRadius;
        uniform float uOuterRadius;
        uniform vec3 uLightDirection;
        uniform float uOpacity;
        uniform float uTime;

        varying vec3 vLocalPos;
        varying vec3 vWorldPos;
        varying float vRadius;

        void main() {
          // Normalize radius from inner (0.0) to outer (1.0)
          float t = (vRadius - uInnerRadius) / (uOuterRadius - uInnerRadius);
          if (t < 0.0 || t > 1.0) discard;

          // 1. Density Profile: Bright core with delicate feathered edges
          float edgeFeather = smoothstep(0.0, 0.12, t) * smoothstep(1.0, 0.82, t);
          float coreIntensity = pow(sin(t * 3.14159265), 1.6);

          // Subtle Saturnian micro-striations/particle sheen
          float striations = sin(t * 45.0) * 0.06 + sin(t * 110.0) * 0.03;
          float ringDensity = clamp(coreIntensity + striations, 0.0, 1.0) * edgeFeather;

          // 2. Color Palette: Warm Celestial Gold (#D8A83E)
          vec3 baseGold = vec3(0.847, 0.659, 0.243);       // #D8A83E
          vec3 coreHighlight = vec3(0.965, 0.855, 0.520);   // luminous warm gold core
          vec3 outerAmberGlow = vec3(0.68, 0.48, 0.16);     // soft outer ambient

          vec3 ringColor = mix(outerAmberGlow, baseGold, smoothstep(0.05, 0.45, t));
          ringColor = mix(ringColor, coreHighlight, pow(coreIntensity, 2.2));

          // 3. Planetary Shadow: The sphere (r=2.0) casts a shadow onto the back of the ring
          // If the ring point is behind the planet along the stellar light ray:
          vec3 L = normalize(uLightDirection);
          // Distance along light direction from planet center
          float distAlongLight = dot(vLocalPos, L);
          // If distAlongLight < 0, the ring point is on the shadow side of the planet
          if (distAlongLight < -0.2) {
            vec3 closestOnRay = distAlongLight * L;
            float distFromRay = length(vLocalPos - closestOnRay);
            // Planet radius is 2.0
            float shadowFactor = smoothstep(1.85, 2.25, distFromRay);
            ringColor *= mix(0.18, 1.0, shadowFactor);
          }

          // Subtle orbital shimmer
          float shimmer = sin(atan(vLocalPos.y, vLocalPos.x) * 6.0 + uTime * 0.8) * 0.04 + 0.96;

          float finalAlpha = ringDensity * uOpacity * 0.82 * shimmer;

          gl_FragColor = vec4(ringColor, finalAlpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
    });
  }, [ringInnerRadius, ringOuterRadius]);

  useFrame((state, delta) => {
    if (!planetGroupRef.current) return;

    // Slow, realistic planetary rotation revealing craters
    if (surfaceMeshRef.current) {
      surfaceMeshRef.current.rotation.y += delta * 0.038;
      surfaceMeshRef.current.rotation.x = 0.12;
    }

    // Slow, subtle synchronized orbital rotation of the ring
    if (ringMeshRef.current) {
      ringMeshRef.current.rotation.z += delta * 0.012;
    }

    // Micro orbital breathing
    const time = state.clock.getElapsedTime();
    planetGroupRef.current.position.y = 0.15 + Math.sin(time * 0.3) * 0.04;

    // Planet & Ring slowly emerge together between 1.5s and 3.0s
    const planetAlpha = THREE.MathUtils.clamp((progress - 0.16) / 0.22, 0, 1);
    
    const scale = THREE.MathUtils.lerp(0.92, 1.0, planetAlpha);
    planetGroupRef.current.scale.setScalar(scale * (isMobile ? 0.78 : 1.0));

    planetSurfaceShader.uniforms.uOpacity.value = planetAlpha;
    planetSurfaceShader.uniforms.uTime.value = time;
    atmosphericHaloShader.uniforms.uOpacity.value = planetAlpha;
    saturnRingShader.uniforms.uOpacity.value = planetAlpha;
    saturnRingShader.uniforms.uTime.value = time;
  });

  return (
    // Asymmetric cinematic composition: Planet placed slightly right of center
    <group ref={planetGroupRef} position={[0.9, 0.15, 0]}>
      {/* 1. Core 3D Spherical Crust (renders FIRST with depthWrite: true) */}
      <mesh ref={surfaceMeshRef} renderOrder={1}>
        <sphereGeometry args={[2.0, 72, 72]} />
        <primitive object={planetSurfaceShader} attach="material" />
      </mesh>

      {/* 2. Saturn-Style Celestial Gold Planetary Ring (renderOrder 2) */}
      {/* Tilted relative to camera: passes BEHIND at the top and IN FRONT at the bottom */}
      <mesh
        ref={ringMeshRef}
        rotation={[-1.15, 0.35, -0.22]}
        renderOrder={2}
      >
        <ringGeometry args={[ringInnerRadius, ringOuterRadius, 128, 8]} />
        <primitive object={saturnRingShader} attach="material" />
      </mesh>

      {/* 3. Atmospheric Rim / Limb Scattering Layer (renderOrder 3) */}
      <mesh ref={atmosphereMeshRef} scale={1.04} renderOrder={3}>
        <sphereGeometry args={[2.0, 48, 48]} />
        <primitive object={atmosphericHaloShader} attach="material" />
      </mesh>
    </group>
  );
};
