# Learn Upstash Redis

Interactive 3D learning platform for Upstash Redis global replication concepts.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 (inline theme, no config file)
- **3D:** React Three Fiber + Drei + custom GLSL shaders
- **Animations:** Framer Motion (UI panels), R3F useFrame (3D)
- **State:** Zustand v5 (stores in `src/lib/store/`)
- **Data:** All simulated client-side (no real Redis connection)

## Architecture

Single-page app — all 6 experiences render from `src/app/page.tsx` with `activeStep` state (0–5). The globe stays mounted across steps; panels swap in/out with Framer Motion transitions.

### Key Patterns

- `GlobeScene` accepts `children` prop for 3D overlays (arcs, packets, visualizations)
- Globe radius: `GLOBE_RADIUS = 2` (exported from `Globe.tsx`)
- Lat/lon → 3D: `latLonToVector3(lat, lon, radius)` from `geo-utils.ts`
- Panel style: `border border-zinc-800/50 bg-zinc-950/90 backdrop-blur-md rounded-2xl`
- Each experience has its own Zustand store + visualization component + panel component

### Responsive Layout

- Breakpoint: `md:` (768px) — below = mobile, above = desktop
- Desktop: left panel (380px) + globe (offset 190px) + right panel (320px) + bottom nav
- Mobile: globe (full, shifted up) + bottom sheet panel at `top-[50vh]` + compact nav
- `isMobile` state via `window.innerWidth < 768` resize listener

## Upstash Branding

- Background: `#0a0a0a` (zinc-950)
- Accent: emerald-500 (`#10b981`)
- Fonts: Geist Sans / Geist Mono

## Upstash Redis Concepts

### Single Leader Replication
- One **primary region** handles all writes
- Multiple **read regions** serve read-only traffic
- Writes replicate asynchronously from primary → all read replicas

### Write Path
- Write → primary → confirmed → response returned
- Replication to read replicas happens **after** the write is confirmed

### Read Path
- Read → automatically routed to **nearest** read region
- Sub-millisecond latency when reading from same region

### Eventual Consistency
- After a write, read replicas may briefly return stale data
- Replication lag depends on geographic distance

### High Availability & Failover
- Primary region has **backup replicas within the same region** for HA
- If primary node fails → **in-region leader election** → backup replica promoted
- New leader stays in the **same geographic region** (no cross-region election)
- Read replicas continue serving (possibly stale) reads during failover
- Only writes are briefly interrupted

### Available Regions (14 AWS + 4 GCP = 18 total)

Defined in `src/lib/regions.ts`. Co-located regions (same lat/lon, different providers) are grouped by `groupRegionsByLocation()`.

**AWS (14):** us-east-1, us-east-2, us-west-1, us-west-2, ca-central-1, eu-west-1, eu-west-2, eu-central-1, ap-south-1, ap-northeast-1, ap-southeast-1, ap-southeast-2, sa-east-1, af-south-1

**GCP (4):** us-east4, us-central1, europe-west1, asia-northeast1

## Experiences

All 6 experiences are implemented:

| Step | Experience | Panel | Visualization | Store |
|------|-----------|-------|---------------|-------|
| 0 | Globe Explorer | — | GlobeScene | — |
| 1 | Region Builder | RegionBuilder, LatencyStats | ConnectionArcs, LatencyHeatmap | database-store |
| 2 | Write Flow | WritePanel, EventTimeline | WriteFlowVisualization | write-flow-store |
| 3 | Read Flow | ReadPanel, LatencyComparison | ReadFlowVisualization | read-flow-store |
| 4 | Consistency Race | ConsistencyRacePanel | ConsistencyRaceVisualization | consistency-race-store |
| 5 | Failover | FailoverPanel, FailoverTimeline | FailoverVisualization | failover-store |

## Project Structure

```
src/
├── app/
│   ├── page.tsx                        — Single-page app (all experiences)
│   ├── layout.tsx                      — Root layout + OG metadata
│   └── globals.css                     — Tailwind v4, animations
├── components/
│   ├── globe/                          — 3D components (17 files)
│   │   ├── GlobeScene.tsx              — R3F Canvas wrapper
│   │   ├── Globe.tsx                   — GLSL shader Earth
│   │   ├── RegionMarker.tsx            — Region dots on globe
│   │   ├── RegionTooltip.tsx           — Hover tooltip (Drei Html)
│   │   ├── ConnectionArc.tsx           — Single arc between regions
│   │   ├── ConnectionArcs.tsx          — All arcs container
│   │   ├── DataPacket.tsx              — Animated traveling orb
│   │   ├── ClientMarker.tsx            — User's simulated position
│   │   ├── UserLocationMarker.tsx      — Real geolocation marker
│   │   ├── LatencyHeatmap.tsx          — Read latency color overlay
│   │   ├── LatencyLabel.tsx            — "45ms" label on arc
│   │   ├── PrimaryFlash.tsx            — Flash effect at primary
│   │   ├── ReplicationWave.tsx         — Expanding ring from primary
│   │   ├── WriteFlowVisualization.tsx  — Write path animation
│   │   ├── ReadFlowVisualization.tsx   — Read path animation
│   │   ├── ConsistencyRaceVisualization.tsx — Consistency race visual
│   │   └── FailoverVisualization.tsx   — Failover animation
│   ├── panels/                         — UI panels (10 files)
│   │   ├── RegionBuilder.tsx           — Build database UI
│   │   ├── WritePanel.tsx              — Redis CLI write input
│   │   ├── ReadPanel.tsx               — Read flow controls
│   │   ├── ConsistencyRacePanel.tsx    — Consistency controls
│   │   ├── FailoverPanel.tsx           — Kill primary / reset
│   │   ├── LatencyStats.tsx            — Latency summary stats
│   │   ├── LatencyComparison.tsx       — Nearest vs primary comparison
│   │   ├── EventTimeline.tsx           — Write/read event timeline
│   │   ├── FailoverTimeline.tsx        — Failover event timeline
│   │   └── InsightCard.tsx             — Reusable insight card
│   └── ui/                             — Shared UI (6 files)
│       ├── LearningPathNav.tsx         — Bottom step navigation
│       ├── WelcomeOverlay.tsx          — Onboarding modal
│       ├── WelcomeButton.tsx           — Re-open welcome
│       ├── SoundToggle.tsx             — Audio toggle
│       ├── NextStepButton.tsx          — Floating next/restart button
│       └── LoadingScreen.tsx           — Loading indicator
└── lib/
    ├── regions.ts                      — 18 regions with lat/lon + grouping
    ├── geo-utils.ts                    — latLonToVector3, calculateDistance
    ├── arc-utils.ts                    — computeArcPoints for 3D arcs
    ├── sounds.ts                       — Sound effect utilities
    ├── hooks/
    │   └── use-geolocation.ts          — Browser geolocation hook
    ├── simulation/
    │   └── latency.ts                  — Distance-based latency estimation
    └── store/
        ├── database-store.ts           — Primary + read replica config
        ├── write-flow-store.ts         — Write animation state
        ├── read-flow-store.ts          — Read animation state
        ├── consistency-race-store.ts   — Consistency race state
        ├── failover-store.ts           — Failover + leader election
        └── onboarding-store.ts         — Welcome/progress (localStorage)
```
