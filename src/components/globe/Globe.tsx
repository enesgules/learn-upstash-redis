"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

const GLOBE_RADIUS = 2;

export { GLOBE_RADIUS };

// ─── Earth Vertex Shader ────────────────────────────────────────────
const earthVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// ─── Earth Fragment Shader ──────────────────────────────────────────
const earthFragmentShader = /* glsl */ `
  uniform sampler2D uDayTexture;
  uniform sampler2D uNightTexture;
  uniform sampler2D uSpecularTexture;
  uniform sampler2D uBumpRoughnessClouds;
  uniform vec3 uSunDirection;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 sunDir = normalize(uSunDirection);
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vPosition);

    // Day/night factor via sigmoid
    float cosAngle = dot(normal, sunDir);
    float dayMix = 1.0 / (1.0 + exp(-10.0 * cosAngle));

    // Sample textures
    vec3 dayColor = texture2D(uDayTexture, vUv).rgb;
    vec3 nightColor = texture2D(uNightTexture, vUv).rgb;

    // Twilight warm tint — moderate band at the terminator
    float twilightInner = smoothstep(-0.1, 0.03, cosAngle);
    float twilightOuter = smoothstep(0.0, 0.15, cosAngle);
    float twilightZone = twilightInner - twilightOuter;
    vec3 twilightColor = vec3(1.0, 0.55, 0.3);

    // Base color: blend day/night
    vec3 color = mix(nightColor, dayColor, dayMix);

    // Add twilight tint
    color = mix(color, twilightColor * max(dayColor, vec3(0.1)), twilightZone * 0.45);

    // Specular reflection on oceans
    float specMask = texture2D(uSpecularTexture, vUv).r;
    vec3 reflectDir = reflect(-sunDir, normal);
    float specular = pow(max(dot(reflectDir, viewDir), 0.0), 20.0);
    color += specular * specMask * dayMix * 0.5;

    // Cloud layer from composite texture (B channel = clouds)
    vec3 brc = texture2D(uBumpRoughnessClouds, vUv).rgb;
    float cloudAlpha = brc.b;
    float cloudBrightness = mix(0.03, 1.0, dayMix);
    color = mix(color, vec3(cloudBrightness), cloudAlpha * 0.6);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ─── Atmosphere Vertex Shader ───────────────────────────────────────
const atmosphereVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vNormalView;
  varying vec3 vPositionView;

  void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vNormalView = normalize(normalMatrix * normal);
    vPositionView = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// ─── Atmosphere Fragment Shader ─────────────────────────────────────
const atmosphereFragmentShader = /* glsl */ `
  uniform vec3 uSunDirection;
  uniform vec3 uAtmosphereColor;

  varying vec3 vNormal;
  varying vec3 vNormalView;
  varying vec3 vPositionView;

  void main() {
    vec3 sunDir = normalize(uSunDirection);

    // Sun-facing mask — tighter falloff, shifted so less spill to night side
    float cosAngle = dot(vNormal, sunDir);
    float sunMask = 1.0 / (1.0 + exp(-12.0 * (cosAngle - 0.1)));

    // Fresnel effect — higher power = thinner glow at edges
    float fresnel = pow(1.0 + dot(vPositionView, vNormalView), 3.0);
    fresnel = clamp(fresnel, 0.0, 1.0);

    // Blend atmosphere towards a soft white on the day side
    float whiteness = smoothstep(0.0, 0.5, cosAngle);
    vec3 dayAtmo = mix(uAtmosphereColor, vec3(0.9, 0.93, 0.95), whiteness * 0.6);

    // Gentle intensity boost on the day side
    float dayBoost = mix(0.6, 0.8, whiteness);

    gl_FragColor = vec4(dayAtmo, fresnel * sunMask * dayBoost);
  }
`;

/**
 * Compute sun direction from the current UTC time.
 * The sun is roughly above the point on Earth where local solar time is noon.
 * - Longitude: based on UTC hour (12:00 UTC = sun over 0° lon, each hour = 15°)
 * - Latitude: based on Earth's axial tilt (~23.44°) and day of year (declination)
 */
function getSunDirection(date: Date): THREE.Vector3 {
  const DEG = Math.PI / 180;

  // Day of year (0-365)
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear =
    (date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

  // Solar declination (latitude where sun is directly overhead)
  const declination = -23.44 * Math.cos((360 / 365) * (dayOfYear + 10) * DEG);

  // Hour angle: at 12:00 UTC the sun is over 0° longitude
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60;
  const longitude = (12 - hours) * 15; // degrees

  // Convert lat/lon to direction vector
  const latRad = declination * DEG;
  const lonRad = longitude * DEG;

  return new THREE.Vector3(
    Math.cos(latRad) * Math.cos(lonRad),
    Math.sin(latRad),
    -Math.cos(latRad) * Math.sin(lonRad)
  ).normalize();
}

export default function Globe() {
  const [dayTexture, nightTexture, specularTexture, brcTexture] = useTexture([
    "/textures/earth_day_8k.jpg",
    "/textures/earth_night_8k.jpg",
    "/textures/earth_specular_2048.jpg",
    "/textures/earth_bump_roughness_clouds_4096.jpg",
  ]);

  const sunDirection = useMemo(() => getSunDirection(new Date()), []);
  const earthMatRef = useRef<THREE.ShaderMaterial>(null);
  const atmosMatRef = useRef<THREE.ShaderMaterial>(null);

  // Update sun direction every frame (moves slowly, but stays accurate)
  useFrame(() => {
    const dir = getSunDirection(new Date());
    if (earthMatRef.current) {
      earthMatRef.current.uniforms.uSunDirection.value.copy(dir);
    }
    if (atmosMatRef.current) {
      atmosMatRef.current.uniforms.uSunDirection.value.copy(dir);
    }
  });

  const earthUniforms = useMemo(
    () => ({
      uDayTexture: { value: dayTexture },
      uNightTexture: { value: nightTexture },
      uSpecularTexture: { value: specularTexture },
      uBumpRoughnessClouds: { value: brcTexture },
      uSunDirection: { value: sunDirection },
    }),
    [dayTexture, nightTexture, specularTexture, brcTexture, sunDirection]
  );

  const atmosphereUniforms = useMemo(
    () => ({
      uSunDirection: { value: sunDirection },
      uAtmosphereColor: { value: new THREE.Color("#7db8e0") },
    }),
    [sunDirection]
  );

  return (
    <group>
      {/* Earth */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 128, 128]} />
        <shaderMaterial
          ref={earthMatRef}
          vertexShader={earthVertexShader}
          fragmentShader={earthFragmentShader}
          uniforms={earthUniforms}
        />
      </mesh>

      {/* Atmosphere (Fresnel glow) */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS + 0.05, 64, 64]} />
        <shaderMaterial
          ref={atmosMatRef}
          vertexShader={atmosphereVertexShader}
          fragmentShader={atmosphereFragmentShader}
          uniforms={atmosphereUniforms}
          transparent
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
