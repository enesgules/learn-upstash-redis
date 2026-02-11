"use client";

import { Suspense, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import Globe from "./Globe";
import RegionMarker from "./RegionMarker";
import { regions, type Region } from "@/lib/regions";

interface GlobeSceneProps {
  children?: ReactNode;
  onRegionClick?: (region: Region) => void;
  selectedRegions?: string[];
  primaryRegion?: string | null;
}

export default function GlobeScene({
  children,
  onRegionClick,
  selectedRegions = [],
  primaryRegion = null,
}: GlobeSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5.5], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
      style={{ background: "transparent" }}
    >
      <Suspense fallback={null}>
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 3, 5]} intensity={0.8} />
        <directionalLight position={[-5, -3, -5]} intensity={0.2} />

        {/* Stars background */}
        <Stars
          radius={100}
          depth={50}
          count={3000}
          factor={4}
          saturation={0}
          fade
          speed={0.5}
        />

        {/* Globe */}
        <Globe />

        {/* Region markers */}
        {regions.map((region) => (
          <RegionMarker
            key={region.id}
            region={region}
            isSelected={selectedRegions.includes(region.id)}
            isPrimary={primaryRegion === region.id}
            onClick={onRegionClick}
          />
        ))}

        {/* Extensibility: experiences inject arcs, packets, etc. */}
        {children}

        {/* Camera controls */}
        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.05}
          minDistance={3.5}
          maxDistance={10}
          autoRotate
          autoRotateSpeed={0.3}
          rotateSpeed={0.5}
        />
      </Suspense>
    </Canvas>
  );
}
