"use client";

import { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { useReadFlowStore } from "@/lib/store/read-flow-store";
import { getRegionById } from "@/lib/regions";
import { computeArcPoints } from "@/lib/arc-utils";
import ClientMarker from "./ClientMarker";
import DataPacket from "./DataPacket";
import PrimaryFlash from "./PrimaryFlash";
import { playAckSound, playResponseSound } from "@/lib/sounds";

const ANIMATION_SPEED = 0.003;
const MIN_DURATION = 0.3;

export default function ReadFlowVisualization() {
  const clientLocation = useReadFlowStore((s) => s.clientLocation);
  const phase = useReadFlowStore((s) => s.phase);
  const nearestRegionId = useReadFlowStore((s) => s.nearestRegionId);
  const fetchProgress = useReadFlowStore((s) => s.fetchProgress);
  const responseProgress = useReadFlowStore((s) => s.responseProgress);

  const arriveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (arriveTimeoutRef.current) clearTimeout(arriveTimeoutRef.current);
    };
  }, []);

  // Resolve nearest region
  const nearestRegion = nearestRegionId ? getRegionById(nearestRegionId) : null;

  // Arc from client to nearest replica
  const clientToNearestArc = useMemo(() => {
    if (!clientLocation || !nearestRegion) return null;
    return computeArcPoints(
      clientLocation.lat,
      clientLocation.lon,
      nearestRegion.lat,
      nearestRegion.lon
    );
  }, [clientLocation, nearestRegion]);

  // Reversed arc for response (nearest → client)
  const nearestToClientArc = useMemo(() => {
    if (!clientToNearestArc) return null;
    return [...clientToNearestArc].reverse();
  }, [clientToNearestArc]);

  // Animation loop
  useFrame((_, delta) => {
    const store = useReadFlowStore.getState();

    if (store.phase === "fetching") {
      const duration = Math.max(
        store.nearestLatencyMs * ANIMATION_SPEED,
        MIN_DURATION
      );
      const newProgress = Math.min(
        store.fetchProgress + delta / duration,
        1
      );
      store.setFetchProgress(newProgress);

      if (newProgress >= 1) {
        playAckSound();
        store.onDataFetched();
        // Pause at replica for flash, then start response
        arriveTimeoutRef.current = setTimeout(() => {
          const s = useReadFlowStore.getState();
          if (s.phase === "arriving") {
            s.setPhase("responding");
          }
        }, 400);
      }
    }

    if (store.phase === "responding") {
      const duration = Math.max(
        store.nearestLatencyMs * ANIMATION_SPEED,
        MIN_DURATION
      );
      const newProgress = Math.min(
        store.responseProgress + delta / duration,
        1
      );
      store.setResponseProgress(newProgress);

      if (newProgress >= 1) {
        playResponseSound();
        store.setPhase("complete");
        useReadFlowStore.setState({ response: '"hello"' });
      }
    }
  });

  const isAnimating = phase !== "idle";

  return (
    <group>
      {/* Client marker */}
      {clientLocation && (
        <ClientMarker lat={clientLocation.lat} lon={clientLocation.lon} />
      )}

      {/* Arc line (visible once animation starts) */}
      {clientToNearestArc && isAnimating && (
        <Line
          points={clientToNearestArc}
          color="#10b981"
          lineWidth={1}
          transparent
          opacity={0.4}
        />
      )}

      {/* Fetch packet: client → nearest (emerald) */}
      {clientToNearestArc && phase === "fetching" && (
        <DataPacket
          arcPoints={clientToNearestArc}
          progress={fetchProgress}
          color="#10b981"
        />
      )}

      {/* Flash at nearest replica */}
      {nearestRegion && (
        <PrimaryFlash
          lat={nearestRegion.lat}
          lon={nearestRegion.lon}
          active={phase === "arriving"}
        />
      )}

      {/* Response packet: nearest → client (cyan) */}
      {nearestToClientArc && phase === "responding" && (
        <DataPacket
          arcPoints={nearestToClientArc}
          progress={responseProgress}
          color="#06b6d4"
        />
      )}
    </group>
  );
}
