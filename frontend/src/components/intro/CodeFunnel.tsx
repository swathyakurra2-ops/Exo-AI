import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CodeFunnelProps {
  progress: number;
  isMobile?: boolean;
}

/**
 * Warped Code & Data Sheet Funnel:
 * Directly inspired by Reference 1:
 * Monospace code, algorithm lines, and transit equations
 * streaming and warping along the spacetime manifold into the planetary horizon.
 */
export const CodeFunnel: React.FC<CodeFunnelProps> = ({ progress, isMobile = false }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Generate high-resolution monospace code texture on canvas with tiny typography
  const codeTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');

    if (!ctx) return new THREE.Texture();

    ctx.fillStyle = '#050608';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const codeLines = [
      'transit_depth = (R_planet / R_star)**2;',
      'semi_major_axis = cbrt(G * M_star * P**2 / (4*PI**2));',
      'stellar_flux = L_star / (4 * PI * a_AU**2);',
      'T_eq = T_star * sqrt(R_star / (2*a)) * (1 - albedo)**0.25;',
      'rv_semi_amp = cbrt(2*PI*G/P) * (M_p * sin(i) / M_s**(2/3));',
      'limb_darkening: [u1=0.384, u2=0.219] -> quadratic();',
      'KEPLER_RAW_LC_INGEST: BJD 2455000.4128 -> FLUX_NORM: 0.999124',
      'TESS_TIC_261136674: SECTOR_14 -> BLS_PERIOD_PEAK: 11.2384 d',
      'SPECTRAL_DECONVOLUTION: CH4[2.3um] H2O[1.4um] CO2[4.3um]',
      '01000101 01011000 01001111 00101101 01000001 01001001',
      'exo_prioritize(snr=34.2, habitable_zone=TRUE, terrestrial=TRUE);',
      'orbit_integration::rk4(eccentricity=0.042, arg_periastron=112.4);',
      'flux_variance_ppm = stdev(residuals) * 1e6; // 48.2 ppm',
      'stellar_density_rho = 3.0 * PI / (G * transit_dur**3);',
      'impact_parameter_b = (a / R_star) * cos(inclination);',
      'classification: SUPER_EARTH_OPTIMAL_TEMPERATURE',
    ];

    ctx.font = '13px "JetBrains Mono", monospace';
    const lineHeight = 22;
    const numRows = Math.floor(canvas.height / lineHeight);

    for (let row = 0; row < numRows; row++) {
      const line = codeLines[row % codeLines.length];
      const y = row * lineHeight + 18;

      const rand = Math.random();
      if (rand < 0.6) {
        ctx.fillStyle = 'rgba(232, 234, 237, 0.75)'; // warm off-white
      } else if (rand < 0.88) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.85)'; // electric star blue
      } else {
        ctx.fillStyle = 'rgba(223, 177, 91, 0.85)'; // celestial gold
      }

      ctx.fillText(line, 16, y);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, []);

  // Warped hyperbolic surface geometry curving towards planet at [0.9, 0.15, 0]
  const funnelGeometry = useMemo(() => {
    const segU = isMobile ? 32 : 64;
    const segV = isMobile ? 32 : 64;
    const geom = new THREE.PlaneGeometry(15, 9, segU, segV);

    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let u = (pos.getX(i) + 7.5) / 15; // 0 (near planet) to 1 (outer space)
      let v = (pos.getY(i) + 4.5) / 9;  // 0 to 1

      // Exponential gravitational warp toward planet
      const radiusFromPlanet = 1.95 + Math.pow(u, 1.8) * 11.5;
      const angle = (v - 0.5) * (1.1 - u * 0.35);

      const x = Math.cos(angle) * radiusFromPlanet + 0.9;
      const y = Math.sin(angle) * radiusFromPlanet * 0.72 + 0.15;
      const z = -0.6 - Math.pow(1.0 - u, 2.4) * 3.8;

      pos.setXYZ(i, x, y, z);
    }

    geom.computeVertexNormals();
    return geom;
  }, [isMobile]);

  const funnelMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: codeTexture },
        uTime: { value: 0 },
        uOpacity: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform float uTime;
        uniform float uOpacity;
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          // Continuous streaming of code lines inwards toward the planet
          vec2 flowUv = vec2(vUv.x * 2.2 + uTime * 0.09, vUv.y * 3.5);
          vec4 texColor = texture2D(uTexture, flowUv);

          // Intense compression glow near the planetary gravitational horizon
          float compressionGlow = pow(1.0 - vUv.x, 2.4);
          vec3 edgeGlowColor = mix(vec3(0.22, 0.74, 0.97), vec3(0.88, 0.70, 0.36), compressionGlow);

          // Subtle falloff at boundary edges
          float edgeAlpha = smoothstep(0.01, 0.22, vUv.x) * smoothstep(1.0, 0.75, vUv.x);
          edgeAlpha *= smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.82, vUv.y);

          vec3 finalRgb = texColor.rgb + edgeGlowColor * compressionGlow * 1.2;
          float finalAlpha = texColor.a * edgeAlpha * uOpacity * (0.4 + compressionGlow * 0.45);

          gl_FragColor = vec4(finalRgb, finalAlpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [codeTexture]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Data stream funnel approaches between 2.5s and 5.5s (progress 0.28 to 0.65)
    const alpha = THREE.MathUtils.clamp((progress - 0.26) / 0.28, 0, 0.80);
    funnelMaterial.uniforms.uOpacity.value = alpha;
    funnelMaterial.uniforms.uTime.value = time;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={funnelGeometry}
      material={funnelMaterial}
      position={[0, 0, 0]}
      rotation={[-0.18, 0.12, -0.08]}
    />
  );
};
