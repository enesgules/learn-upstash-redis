"use client";

import { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { useDatabaseStore } from "@/lib/store/database-store";
import { useConsistencyRaceStore } from "@/lib/store/consistency-race-store";
import { getRegionById } from "@/lib/regions";
import { computeArcPoints } from "@/lib/arc-utils";
import ClientMarker from "./ClientMarker";
import DataPacket from "./DataPacket";
import PrimaryFlash from "./PrimaryFlash";
import {
  playPacketSendSound,
  playAckSound,
  playReplicateSound,
  playReplicaArriveSound,
  playStaleSound,
} from "@/lib/sounds";

const ANIMATION_SPEED = 0.003;
const MIN_DURATION = 0.3;

interface Props {
  replicaRegionId: string;
}

export default function ConsistencyRaceVisualization({
  replicaRegionId,
}: Props) {
  const primaryRegionId = useDatabaseStore((s) => s.primaryRegion);

  const clientLocation = useConsistencyRaceStore((s) => s.clientLocation);
  const phase = useConsistencyRaceStore((s) => s.phase);
  const writeProgress = useConsistencyRaceStore((s) => s.writeProgress);
  const replicationProgress = useConsistencyRaceStore(
    (s) => s.replicationProgress
  );
  const readProgress = useConsistencyRaceStore((s) => s.readProgress);
  const readStarted = useConsistencyRaceStore((s) => s.readStarted);
  const isStale = useConsistencyRaceStore((s) => s.isStale);

  const ackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      if (ackTimeoutRef.current) clearTimeout(ackTimeoutRef.current);
      if (readDelayTimeoutRef.current) clearTimeout(readDelayTimeoutRef.current);
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    };
  }, []);

  const primary = primaryRegionId ? getRegionById(primaryRegionId) : null;
  const replica = getRegionById(replicaRegionId);

  // Arc: client → primary
  const writArc = useMemo(() => {
    if (!clientLocation || !primary) return null;
    return computeArcPoints(
      clientLocation.lat,
      clientLocation.lon,
      primary.lat,
      primary.lon
    );
  }, [clientLocation, primary]);

  // Arc: primary → replica (replication)
  const replicationArc = useMemo(() => {
    if (!primary || !replica) return null;
    return computeArcPoints(primary.lat, primary.lon, replica.lat, replica.lon);
  }, [primary, replica]);

  // Arc: client → replica
  const readArc = useMemo(() => {
    if (!clientLocation || !replica) return null;
    return computeArcPoints(
      clientLocation.lat,
      clientLocation.lon,
      replica.lat,
      replica.lon
    );
  }, [clientLocation, replica]);

  // Animation loop
  useFrame((_, delta) => {
    const store = useConsistencyRaceStore.getState();

    // --- Writing phase: client → primary ---
    if (store.phase === "writing") {
      const duration = Math.max(
        store.primaryLatencyMs * ANIMATION_SPEED,
        MIN_DURATION
      );
      const p = Math.min(store.writeProgress + delta / duration, 1);
      store.setWriteProgress(p);

      if (p >= 1) {
        playAckSound();
        store.setPhase("write-ack");

        // After flash pause, start the race
        ackTimeoutRef.current = setTimeout(() => {
          const s = useConsistencyRaceStore.getState();
          if (s.phase === "write-ack") {
            playReplicateSound();
            s.setPhase("racing");

            // Schedule the read request after user's delay
            const scaledDelay = Math.max(s.readDelay * ANIMATION_SPEED * 1000, 0);
            readDelayTimeoutRef.current = setTimeout(() => {
              const s2 = useConsistencyRaceStore.getState();
              if (s2.phase === "racing" && !s2.readStarted) {
                playPacketSendSound();
                s2.markReadStarted();
              }
            }, scaledDelay);
          }
        }, 400);
      }
    }

    // --- Racing phase: replication wave + read packet ---
    if (store.phase === "racing") {
      // Replication wave always progresses
      const repDuration = Math.max(
        store.replicationLatencyMs * ANIMATION_SPEED,
        MIN_DURATION
      );
      const repP = Math.min(
        store.replicationProgress + delta / repDuration,
        1
      );
      store.setReplicationProgress(repP);

      // Read packet progresses only after delay
      if (store.readStarted) {
        const readDuration = Math.max(
          store.readLatencyMs * ANIMATION_SPEED,
          MIN_DURATION
        );
        const readP = Math.min(store.readProgress + delta / readDuration, 1);
        store.setReadProgress(readP);
      }

      // Check if either arrived
      const replicationArrived = repP >= 1;
      const readArrived = store.readStarted && store.readProgress >= 1;

      if (readArrived || replicationArrived) {
        // Determine result based on actual latency math (not animation timing)
        const isStale =
          store.readDelay + store.readLatencyMs < store.replicationLatencyMs;

        if (isStale) {
          playStaleSound();
        } else {
          playReplicaArriveSound();
        }

        store.onRaceResult(isStale);

        resultTimeoutRef.current = setTimeout(() => {
          const s = useConsistencyRaceStore.getState();
          if (s.phase === "result") {
            s.setPhase("complete");
          }
        }, 600);
      }
    }
  });

  const isAnimating = phase !== "idle" && phase !== "complete";

  return (
    <group>
      {/* Client marker */}
      {clientLocation && (
        <ClientMarker lat={clientLocation.lat} lon={clientLocation.lon} />
      )}

      {/* Write arc + packet: client → primary */}
      {writArc && isAnimating && (
        <group>
          <Line
            points={writArc}
            color="#06b6d4"
            lineWidth={1}
            transparent
            opacity={0.3}
          />
          {phase === "writing" && (
            <DataPacket
              arcPoints={writArc}
              progress={writeProgress}
              color="#06b6d4"
            />
          )}
        </group>
      )}

      {/* Primary flash on write ack */}
      {primary && (
        <PrimaryFlash
          lat={primary.lat}
          lon={primary.lon}
          active={phase === "write-ack"}
        />
      )}

      {/* Replication arc: primary → replica */}
      {replicationArc && (phase === "racing" || phase === "result" || phase === "complete") && (
        <group>
          <Line
            points={replicationArc.slice(
              0,
              Math.max(2, Math.ceil(replicationProgress * replicationArc.length))
            )}
            color="#10b981"
            lineWidth={1}
            transparent
            opacity={0.4}
          />
          {phase === "racing" && replicationProgress > 0 && replicationProgress < 1 && (
            <DataPacket
              arcPoints={replicationArc}
              progress={replicationProgress}
              color="#10b981"
            />
          )}
        </group>
      )}

      {/* Read arc + packet: client → replica */}
      {readArc && readStarted && (phase === "racing" || phase === "result" || phase === "complete") && (
        <group>
          <Line
            points={readArc}
            color="#f59e0b"
            lineWidth={1}
            transparent
            opacity={0.3}
          />
          {phase === "racing" && readStarted && (
            <DataPacket
              arcPoints={readArc}
              progress={readProgress}
              color="#f59e0b"
            />
          )}
        </group>
      )}

      {/* Result flash at replica */}
      {replica && (phase === "result" || phase === "complete") && (
        <PrimaryFlash
          lat={replica.lat}
          lon={replica.lon}
          active={phase === "result"}
          color={isStale ? "#ef4444" : "#10b981"}
        />
      )}
    </group>
  );
}
