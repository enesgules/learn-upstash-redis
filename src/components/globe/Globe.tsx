"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

const GLOBE_RADIUS = 2;

export { GLOBE_RADIUS };

export type GlobeTextureId = "water-4k" | "night" | "blue-marble-hd";

export interface GlobeTextureConfig {
  id: GlobeTextureId;
  label: string;
  path: string;
  emissive: boolean;
  tintable: boolean;
}

export const GLOBE_TEXTURES: GlobeTextureConfig[] = [
  {
    id: "water-4k",
    label: "Water Map",
    path: "/textures/earth-water-4k.jpg",
    emissive: false,
    tintable: true,
  },
  {
    id: "night",
    label: "Night Lights",
    path: "/textures/earth-night.jpg",
    emissive: true,
    tintable: false,
  },
  {
    id: "blue-marble-hd",
    label: "Blue Marble",
    path: "/textures/earth-blue-marble-tg.jpg",
    emissive: false,
    tintable: false,
  },
];

export interface GlobeTint {
  land: string;
  water: string;
}

export const GLOBE_TINT_PRESETS: { label: string; tint: GlobeTint }[] = [
  { label: "Emerald", tint: { land: "#0a1f1a", water: "#0d9473" } },
  { label: "Slate", tint: { land: "#0c1220", water: "#334155" } },
  { label: "Ink", tint: { land: "#0a0f1e", water: "#3b5998" } },
  { label: "Frost", tint: { land: "#0b1520", water: "#5eafc0" } },
  { label: "Zinc", tint: { land: "#101010", water: "#3f3f46" } },
  { label: "Warm", tint: { land: "#1a120a", water: "#92643a" } },
];

interface GlobeProps {
  textureId?: GlobeTextureId;
  tint?: GlobeTint | null;
}

// Vertex shader: passes UV coordinates through
const tintVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader: tints land and water separately based on texture brightness
const tintFragmentShader = `
  uniform sampler2D uTexture;
  uniform vec3 uLandColor;
  uniform vec3 uWaterColor;

  varying vec2 vUv;

  void main() {
    vec4 texel = texture2D(uTexture, vUv);
    float brightness = texel.r;

    // Water map: bright = water, dark = land
    vec3 color = mix(uLandColor, uWaterColor, brightness);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export default function Globe({ textureId = "water-4k", tint = null }: GlobeProps) {
  const wireframeRef = useRef<THREE.Mesh>(null);

  const config = GLOBE_TEXTURES.find((t) => t.id === textureId)!;
  const texture = useTexture(config.path);

  const tintUniforms = useMemo(() => {
    const landColor = new THREE.Color(tint?.land ?? "#0a1f1a");
    const waterColor = new THREE.Color(tint?.water ?? "#0d9473");
    return {
      uTexture: { value: texture },
      uLandColor: { value: landColor },
      uWaterColor: { value: waterColor },
    };
  }, [texture, tint?.land, tint?.water]);

  useFrame((_state, delta) => {
    if (wireframeRef.current) {
      wireframeRef.current.rotation.y += delta * 0.02;
    }
  });

  const useTintShader = config.tintable && tint;

  return (
    <group>
      {/* Textured earth sphere */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 128, 128]} />
        {useTintShader ? (
          <shaderMaterial
            vertexShader={tintVertexShader}
            fragmentShader={tintFragmentShader}
            uniforms={tintUniforms}
          />
        ) : config.emissive ? (
          <meshStandardMaterial
            map={texture}
            emissiveMap={texture}
            emissive="#ffffff"
            emissiveIntensity={0.6}
            roughness={0.9}
            metalness={0}
          />
        ) : (
          <meshStandardMaterial
            map={texture}
            roughness={0.8}
            metalness={0.1}
          />
        )}
      </mesh>

      {/* Wireframe overlay */}
      <mesh ref={wireframeRef}>
        <sphereGeometry args={[GLOBE_RADIUS + 0.003, 48, 48]} />
        <meshBasicMaterial
          color="#10b981"
          wireframe
          transparent
          opacity={0.015}
        />
      </mesh>

      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS + 0.04, 64, 64]} />
        <meshBasicMaterial
          color="#10b981"
          transparent
          opacity={0.03}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}
