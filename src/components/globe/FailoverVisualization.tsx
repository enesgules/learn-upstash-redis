"use client";

import { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Line, Html } from "@react-three/drei";
import * as THREE from "three";
import { useDatabaseStore } from "@/lib/store/database-store";
import { useFailoverStore } from "@/lib/store/failover-store";
import { getRegionById } from "@/lib/regions";
import { latLonToVector3 } from "@/lib/geo-utils";
import { buildGreatCircleArc } from "./ConnectionArc";
import { GLOBE_RADIUS } from "./Globe";
import DataPacket from "./DataPacket";
import PrimaryFlash from "./PrimaryFlash";
import ReplicationWave from "./ReplicationWave";
import {
  playFailureAlarmSound,
  playElectionPulseSound,
  playRecoveryChimeSound,
} from "@/lib/sounds";

const ANIMATION_SPEED = 0.003;
const MIN_DURATION = 0.3;

function computeArcPoints(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number
): THREE.Vector3[] {
  const start = latLonToVector3(startLat, startLon, GLOBE_RADIUS);
  const end = latLonToVector3(endLat, endLon, GLOBE_RADIUS);
  const angularDistance = start.angleTo(end);
  const peakHeight = 0.15 + (angularDistance / Math.PI) * 0.6;
  return buildGreatCircleArc(startLat, startLon, endLat, endLon, 64, peakHeight);
}

/** Old arcs dissolving with fading opacity */
function BreakingArcs({ progress }: { progress: number }) {
  const primaryRegion = useDatabaseStore((s) => s.primaryRegion);
  const readRegions = useDatabaseStore((s) => s.readRegions);

  const primary = primaryRegion ? getRegionById(primaryRegion) : null;

  const arcs = useMemo(() => {
    if (!primary) return [];
    return readRegions
      .map((id) => {
        const replica = getRegionById(id);
        if (!replica) return null;
        return {
          id,
          points: computeArcPoints(primary.lat, primary.lon, replica.lat, replica.lon),
        };
      })
      .filter((a) => a !== null);
  }, [primary, readRegions]);

  const opacity = 0.6 * (1 - progress);

  if (opacity <= 0) return null;

  return (
    <group>
      {arcs.map((arc) => (
        <Line
          key={arc.id}
          points={arc.points}
          color="#ef4444"
          lineWidth={1}
          transparent
          opacity={opacity}
        />
      ))}
    </group>
  );
}

/** Queued client write request — shows a client dot, command label, and arc */
function QueuedRequestPacket({
  clientLat,
  clientLon,
  command,
  targetLat,
  targetLon,
  newPrimaryLat,
  newPrimaryLon,
  isDraining,
  drainingProgress,
}: {
  clientLat: number;
  clientLon: number;
  command: string;
  targetLat: number;
  targetLon: number;
  newPrimaryLat: number;
  newPrimaryLon: number;
  isDraining: boolean;
  drainingProgress: number;
}) {
  const clientPos = useMemo(
    () => latLonToVector3(clientLat, clientLon, GLOBE_RADIUS + 0.01),
    [clientLat, clientLon]
  );

  const labelPos = useMemo(
    () => latLonToVector3(clientLat, clientLon, GLOBE_RADIUS + 0.06),
    [clientLat, clientLon]
  );

  const arcToFailed = useMemo(
    () => computeArcPoints(clientLat, clientLon, targetLat, targetLon),
    [clientLat, clientLon, targetLat, targetLon]
  );

  const arcToNewPrimary = useMemo(
    () => computeArcPoints(clientLat, clientLon, newPrimaryLat, newPrimaryLon),
    [clientLat, clientLon, newPrimaryLat, newPrimaryLon]
  );

  const displayArc = isDraining ? arcToNewPrimary : arcToFailed;
  const displayProgress = isDraining ? drainingProgress : 0.7;

  const badgeRef = useRef<HTMLDivElement>(null);
  const normal = useMemo(() => clientPos.clone().normalize(), [clientPos]);

  useFrame((state) => {
    if (badgeRef.current) {
      const dot = normal.dot(state.camera.position.clone().normalize());
      badgeRef.current.style.opacity = dot > 0.05 ? "1" : "0";
    }
  });

  return (
    <group>
      {/* Client dot */}
      <mesh position={clientPos}>
        <sphereGeometry args={[0.015, 12, 12]} />
        <meshBasicMaterial color={isDraining ? "#06b6d4" : "#f59e0b"} />
      </mesh>

      {/* Command label at client position */}
      <Html
        position={labelPos}
        center
        distanceFactor={8}
        zIndexRange={[1, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div ref={badgeRef} className="transition-opacity duration-150">
          <span
            className="whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-[8px] font-medium"
            style={{
              color: isDraining ? "#06b6d4" : "#f59e0b",
              backgroundColor: "rgba(9, 9, 11, 0.85)",
              border: `1px solid ${isDraining ? "rgba(6,182,212,0.3)" : "rgba(245,158,11,0.3)"}`,
            }}
          >
            {command}
          </span>
        </div>
      </Html>

      {/* Arc line */}
      <Line
        points={isDraining ? arcToNewPrimary : arcToFailed}
        color={isDraining ? "#06b6d4" : "#ef4444"}
        lineWidth={1}
        transparent
        opacity={0.25}
      />

      {/* Traveling packet */}
      <DataPacket
        arcPoints={displayArc}
        progress={displayProgress}
        color={isDraining ? "#06b6d4" : "#f59e0b"}
        size={0.02}
      />
    </group>
  );
}

/** New arcs drawing in progressively from new primary */
function RecoveryArcs({
  newPrimaryId,
  recoveryProgress,
}: {
  newPrimaryId: string;
  recoveryProgress: number;
}) {
  const readRegions = useDatabaseStore((s) => s.readRegions);
  const failedRegionId = useFailoverStore((s) => s.failedRegionId);
  const newPrimary = getRegionById(newPrimaryId);

  const arcs = useMemo(() => {
    if (!newPrimary) return [];
    return readRegions
      .filter((id) => id !== newPrimaryId && id !== failedRegionId)
      .map((id) => {
        const replica = getRegionById(id);
        if (!replica) return null;
        return {
          id,
          points: computeArcPoints(newPrimary.lat, newPrimary.lon, replica.lat, replica.lon),
        };
      })
      .filter((a) => a !== null);
  }, [newPrimary, readRegions, newPrimaryId, failedRegionId]);

  return (
    <group>
      {arcs.map((arc) => {
        const visibleCount = Math.max(2, Math.ceil(recoveryProgress * arc.points.length));
        const visiblePoints = arc.points.slice(0, visibleCount);
        return (
          <Line
            key={arc.id}
            points={visiblePoints}
            color="#10b981"
            lineWidth={1}
            transparent
            opacity={0.5}
          />
        );
      })}
    </group>
  );
}

export default function FailoverVisualization() {
  const phase = useFailoverStore((s) => s.phase);
  const failedRegionId = useFailoverStore((s) => s.failedRegionId);
  const newPrimaryId = useFailoverStore((s) => s.newPrimaryId);
  const arcBreakProgress = useFailoverStore((s) => s.arcBreakProgress);
  const detectionProgress = useFailoverStore((s) => s.detectionProgress);
  const electionVotes = useFailoverStore((s) => s.electionVotes);
  const electionProgress = useFailoverStore((s) => s.electionProgress);
  const recoveryProgress = useFailoverStore((s) => s.recoveryProgress);
  const drainingProgress = useFailoverStore((s) => s.drainingProgress);
  const queuedRequests = useFailoverStore((s) => s.queuedRequests);
  const requestQueueVisible = useFailoverStore((s) => s.requestQueueVisible);

  const failedRegion = failedRegionId ? getRegionById(failedRegionId) : null;
  const newPrimary = newPrimaryId ? getRegionById(newPrimaryId) : null;

  const phaseTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const soundPlayedRef = useRef<Record<string, boolean>>({});

  // Reset sound flags when phase returns to idle (after reset)
  useEffect(() => {
    if (phase === "idle") {
      soundPlayedRef.current = {};
    }
  }, [phase]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    const timeouts = phaseTimeoutsRef.current;
    return () => {
      for (const t of timeouts) clearTimeout(t);
      timeouts.clear();
    };
  }, []);

  // Main animation loop
  useFrame((_, delta) => {
    const store = useFailoverStore.getState();

    if (store.phase === "failure") {
      const p = Math.min(store.failureFlashProgress + delta / 0.5, 1);
      store.setFailureFlashProgress(p);
      store.setArcBreakProgress(Math.min(store.arcBreakProgress + delta / 0.6, 1));

      if (!soundPlayedRef.current.failure) {
        playFailureAlarmSound();
        soundPlayedRef.current.failure = true;
      }

      if (p >= 1) {
        store.setPhase("detecting");
        store.setRequestQueueVisible(true);
        store.addEvent({
          time: 0,
          label: "Failure detected by health checks",
          type: "detect",
        });
        store.addEvent({
          time: 0,
          label: `${store.queuedRequests.length} write requests queued`,
          type: "failure",
        });
        store.addEvent({
          time: 0,
          label: "Read replicas still serving reads",
          type: "resume",
        });
      }
    }

    if (store.phase === "detecting") {
      const duration = Math.max(store.detectionTimeMs * ANIMATION_SPEED, MIN_DURATION);
      const p = Math.min(store.detectionProgress + delta / duration, 1);
      store.setDetectionProgress(p);
      store.setDowntime(Math.round(p * store.detectionTimeMs));

      if (p >= 1) {
        if (!soundPlayedRef.current.election) {
          playElectionPulseSound();
          soundPlayedRef.current.election = true;
        }
        store.setPhase("electing");
        store.addEvent({
          time: store.detectionTimeMs,
          label: "Leader election started",
          type: "election",
        });
      }
    }

    if (store.phase === "electing") {
      const duration = Math.max(store.electionTimeMs * ANIMATION_SPEED, MIN_DURATION);
      const p = Math.min(store.electionProgress + delta / duration, 1);
      store.setElectionProgress(p);

      // Advance each vote pulse
      for (const vote of store.electionVotes) {
        if (vote.progress < 1) {
          const voteP = Math.min(vote.progress + delta / (duration * 0.7), 1);
          store.setElectionVoteProgress(vote.fromRegionId, voteP);
        }
      }

      store.setDowntime(
        store.detectionTimeMs + Math.round(p * store.electionTimeMs)
      );

      if (p >= 1) {
        if (!soundPlayedRef.current.recovery) {
          playRecoveryChimeSound();
          soundPlayedRef.current.recovery = true;
        }
        store.onElectionComplete(store.newPrimaryId!);
        store.setPhase("elected");

        // Pause for gold flash, then recover
        const t = setTimeout(() => {
          const s = useFailoverStore.getState();
          if (s.phase === "elected") {
            s.setPhase("recovering");
            s.addEvent({
              time: s.detectionTimeMs + s.electionTimeMs,
              label: "Connections re-establishing",
              type: "reconnect",
            });
            s.addEvent({
              time: s.detectionTimeMs + s.electionTimeMs,
              label: "Queued writes draining to new primary",
              type: "reconnect",
            });
          }
        }, 400);
        phaseTimeoutsRef.current.add(t);
      }
    }

    if (store.phase === "recovering") {
      const duration = Math.max(store.recoveryTimeMs * ANIMATION_SPEED, MIN_DURATION);
      const p = Math.min(store.recoveryProgress + delta / duration, 1);
      store.setRecoveryProgress(p);

      const dp = Math.min(store.drainingProgress + delta / (duration * 1.2), 1);
      store.setDrainingProgress(dp);

      const totalDowntime =
        store.detectionTimeMs +
        store.electionTimeMs +
        Math.round(p * store.recoveryTimeMs);
      store.setDowntime(totalDowntime);

      if (p >= 1 && dp >= 1) {
        store.setPhase("complete");
        store.addEvent({
          time: totalDowntime,
          label: "Cluster fully recovered",
          type: "resume",
        });
      }
    }
  });

  if (phase === "idle") return null;

  return (
    <group>
      {/* Red flash at failed primary */}
      {failedRegion && (phase === "failure" || phase === "detecting") && (
        <PrimaryFlash
          lat={failedRegion.lat}
          lon={failedRegion.lon}
          active={phase === "failure"}
          color="#ef4444"
        />
      )}

      {/* Breaking arcs (dissolving old connections) */}
      {phase !== "complete" && <BreakingArcs progress={arcBreakProgress} />}

      {/* Detection pulse (red ring at failed primary) */}
      {failedRegion && phase === "detecting" && (
        <ReplicationWave
          lat={failedRegion.lat}
          lon={failedRegion.lon}
          progress={detectionProgress}
          color="#ef4444"
        />
      )}

      {/* Queued client write requests */}
      {requestQueueVisible &&
        failedRegion &&
        newPrimary &&
        queuedRequests.map((req) => (
          <QueuedRequestPacket
            key={req.id}
            clientLat={req.clientLat}
            clientLon={req.clientLon}
            command={req.command}
            targetLat={failedRegion.lat}
            targetLon={failedRegion.lon}
            newPrimaryLat={newPrimary.lat}
            newPrimaryLon={newPrimary.lon}
            isDraining={phase === "recovering" || phase === "complete"}
            drainingProgress={drainingProgress}
          />
        ))}

      {/* Election vote pulses */}
      {phase === "electing" &&
        electionVotes.map((vote) => {
          const from = getRegionById(vote.fromRegionId);
          const to = getRegionById(vote.toRegionId);
          if (!from || !to) return null;
          const arcPoints = computeArcPoints(from.lat, from.lon, to.lat, to.lon);
          return (
            <group key={vote.fromRegionId}>
              <Line
                points={arcPoints}
                color="#f59e0b"
                lineWidth={1}
                transparent
                opacity={0.3}
              />
              {vote.progress < 1 && (
                <DataPacket
                  arcPoints={arcPoints}
                  progress={vote.progress}
                  color="#f59e0b"
                  size={0.02}
                />
              )}
            </group>
          );
        })}

      {/* Gold flash at new primary */}
      {newPrimary &&
        (phase === "elected" || phase === "recovering" || phase === "complete") && (
          <PrimaryFlash
            lat={newPrimary.lat}
            lon={newPrimary.lon}
            active={phase === "elected"}
            color="#facc15"
          />
        )}

      {/* Recovery arcs (new connections drawing in) */}
      {newPrimaryId &&
        (phase === "recovering" || phase === "complete") && (
          <RecoveryArcs
            newPrimaryId={newPrimaryId}
            recoveryProgress={recoveryProgress}
          />
        )}
    </group>
  );
}
