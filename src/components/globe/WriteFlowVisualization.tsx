"use client";

import { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { useDatabaseStore } from "@/lib/store/database-store";
import { useWriteFlowStore } from "@/lib/store/write-flow-store";
import { getRegionById } from "@/lib/regions";
import { computeArcPoints } from "@/lib/arc-utils";
import ClientMarker from "./ClientMarker";
import DataPacket from "./DataPacket";
import PrimaryFlash from "./PrimaryFlash";
import { playAckSound, playReplicateSound, playReplicaArriveSound } from "@/lib/sounds";

// Scale factor: real latency (ms) * ANIMATION_SPEED = animation duration (s)
// 200ms * 0.003 = 0.6s animation
const ANIMATION_SPEED = 0.003;
const MIN_DURATION = 0.3;

function ReplicationArc({
  primaryLat,
  primaryLon,
  replicaLat,
  replicaLon,
  progress,
  color,
}: {
  primaryLat: number;
  primaryLon: number;
  replicaLat: number;
  replicaLon: number;
  progress: number;
  color: string;
}) {
  const arcPoints = useMemo(
    () => computeArcPoints(primaryLat, primaryLon, replicaLat, replicaLon),
    [primaryLat, primaryLon, replicaLat, replicaLon]
  );

  // Draw arc progressively
  const visibleCount = Math.max(2, Math.ceil(progress * arcPoints.length));
  const visiblePoints = arcPoints.slice(0, visibleCount);

  return (
    <group>
      <Line
        points={visiblePoints}
        color={color}
        lineWidth={1}
        transparent
        opacity={0.4}
      />
      {progress > 0 && progress < 1 && (
        <DataPacket arcPoints={arcPoints} progress={progress} color={color} />
      )}
    </group>
  );
}

export default function WriteFlowVisualization() {
  const primaryRegion = useDatabaseStore((s) => s.primaryRegion);
  const readRegions = useDatabaseStore((s) => s.readRegions);

  const clientLocation = useWriteFlowStore((s) => s.clientLocation);
  const phase = useWriteFlowStore((s) => s.phase);

  const ackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (ackTimeoutRef.current) clearTimeout(ackTimeoutRef.current);
    };
  }, []);

  // Get primary region data
  const primary = primaryRegion ? getRegionById(primaryRegion) : null;

  // Arc from client to primary
  const clientToPrimaryArc = useMemo(() => {
    if (!clientLocation || !primary) return null;
    return computeArcPoints(
      clientLocation.lat,
      clientLocation.lon,
      primary.lat,
      primary.lon
    );
  }, [clientLocation, primary]);

  // Resolve replica regions
  const replicas = useMemo(
    () =>
      readRegions
        .map((id) => getRegionById(id))
        .filter((r) => r !== undefined),
    [readRegions]
  );

  // Animation loop
  useFrame((_, delta) => {
    const store = useWriteFlowStore.getState();

    if (store.phase === "to-primary") {
      const duration = Math.max(
        store.primaryLatencyMs * ANIMATION_SPEED,
        MIN_DURATION
      );
      const newProgress = Math.min(
        store.primaryProgress + delta / duration,
        1
      );
      store.setPrimaryProgress(newProgress);

      if (newProgress >= 1) {
        playAckSound();
        store.onPrimaryAck();
        // Transition to replicating after a brief pause for the flash
        ackTimeoutRef.current = setTimeout(() => {
          const s = useWriteFlowStore.getState();
          if (s.phase === "primary-ack") {
            playReplicateSound();
            s.setPhase("replicating");
            s.addEvent({
              time: s.primaryLatencyMs,
              label: `Replication started to ${s.replicaStatuses.length} replica${s.replicaStatuses.length !== 1 ? "s" : ""}`,
              type: "replicate",
            });
          }
        }, 400);
      }
    }

    if (store.phase === "replicating") {
      let allArrived = true;
      for (const replica of store.replicaStatuses) {
        if (replica.arrived) continue;
        allArrived = false;
        const duration = Math.max(
          replica.latencyMs * ANIMATION_SPEED,
          MIN_DURATION
        );
        const newProgress = Math.min(
          replica.progress + delta / duration,
          1
        );
        store.setReplicaProgress(replica.regionId, newProgress);
        if (newProgress >= 1 && !replica.arrived) {
          playReplicaArriveSound();
          store.onReplicaArrive(replica.regionId);
        }
      }

      if (allArrived) {
        store.setPhase("complete");
      }
    }
  });

  // Read animation state for rendering
  const primaryProgress = useWriteFlowStore((s) => s.primaryProgress);
  const replicaStatuses = useWriteFlowStore((s) => s.replicaStatuses);

  return (
    <group>
      {/* Client marker */}
      {clientLocation && (
        <ClientMarker lat={clientLocation.lat} lon={clientLocation.lon} />
      )}

      {/* Client → Primary arc + packet */}
      {clientToPrimaryArc &&
        (phase === "to-primary" ||
          phase === "primary-ack" ||
          phase === "replicating" ||
          phase === "complete") && (
          <group>
            <Line
              points={clientToPrimaryArc}
              color="#06b6d4"
              lineWidth={1}
              transparent
              opacity={0.4}
            />
            {phase === "to-primary" && (
              <DataPacket
                arcPoints={clientToPrimaryArc}
                progress={primaryProgress}
                color="#06b6d4"
              />
            )}
          </group>
        )}

      {/* Primary flash */}
      {primary && (
        <PrimaryFlash
          lat={primary.lat}
          lon={primary.lon}
          active={phase === "primary-ack"}
        />
      )}

      {/* Replication arcs + packets */}
      {primary &&
        (phase === "replicating" || phase === "complete") &&
        replicas.map((replica) => {
          const status = replicaStatuses.find(
            (s) => s.regionId === replica.id
          );
          if (!status) return null;

          return (
            <ReplicationArc
              key={replica.id}
              primaryLat={primary.lat}
              primaryLon={primary.lon}
              replicaLat={replica.lat}
              replicaLon={replica.lon}
              progress={status.progress}
              color="#10b981"
            />
          );
        })}

      {/* Flash on each replica when data arrives */}
      {(phase === "replicating" || phase === "complete") &&
        replicaStatuses
          .filter((s) => s.arrived)
          .map((status) => {
            const region = getRegionById(status.regionId);
            if (!region) return null;
            return (
              <PrimaryFlash
                key={`flash-${status.regionId}`}
                lat={region.lat}
                lon={region.lon}
                active={status.arrived}
              />
            );
          })}
    </group>
  );
}
