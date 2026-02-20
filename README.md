![Learn Upstash Redis](public/og-image.png)

# Learn Upstash Redis

An interactive 3D learning platform that teaches distributed database concepts — replication, consistency, and failover — through hands-on visualizations of Upstash Redis.

## Experiences

| # | Experience | What You Learn |
|---|-----------|----------------|
| 1 | **Explore the Globe** | 18 Upstash Redis regions across AWS and GCP |
| 2 | **Build Your Database** | Primary vs read replicas, network topology, latency heatmaps |
| 3 | **Write Flow** | Single-leader writes, async replication to read replicas |
| 4 | **Read Flow** | Nearest-region routing, latency comparison |
| 5 | **Eventual Consistency** | Stale reads, replication lag, the consistency/latency trade-off |
| 6 | **Failover** | In-region leader election, high availability |

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **3D:** React Three Fiber + Drei + custom GLSL shaders
- **Styling:** Tailwind CSS v4
- **State:** Zustand v5
- **Animations:** Framer Motion (UI) + R3F useFrame (3D)

Everything is simulated client-side — no real Redis connection needed.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── page.tsx                        — Single-page app (all 6 experiences)
│   ├── layout.tsx                      — Root layout + OG metadata
│   └── globals.css                     — Tailwind v4, animations, branding
├── components/
│   ├── globe/                          — 3D components (17 files)
│   │   ├── GlobeScene.tsx              — R3F Canvas wrapper
│   │   ├── Globe.tsx                   — GLSL shader Earth
│   │   ├── RegionMarker.tsx            — Region dots on globe
│   │   ├── ConnectionArc(s).tsx        — Arcs between regions
│   │   ├── DataPacket.tsx              — Animated traveling orb
│   │   ├── WriteFlowVisualization.tsx  — Write path animation
│   │   ├── ReadFlowVisualization.tsx   — Read path animation
│   │   ├── FailoverVisualization.tsx   — Failover animation
│   │   └── ...                         — Heatmap, waves, markers, etc.
│   ├── panels/                         — UI panels (10 files)
│   │   ├── RegionBuilder.tsx           — Build database UI
│   │   ├── WritePanel.tsx              — Redis CLI write input
│   │   ├── ReadPanel.tsx               — Read flow controls
│   │   ├── ConsistencyRacePanel.tsx    — Consistency race controls
│   │   ├── FailoverPanel.tsx           — Kill primary / reset
│   │   └── ...                         — Stats, timelines, comparisons
│   └── ui/                             — Shared UI (6 files)
│       ├── LearningPathNav.tsx         — Bottom step navigation
│       ├── WelcomeOverlay.tsx          — Onboarding modal
│       └── ...                         — Sound toggle, buttons, loading
└── lib/
    ├── regions.ts                      — 18 regions (14 AWS + 4 GCP)
    ├── geo-utils.ts                    — Lat/lon ↔ 3D coordinate math
    ├── arc-utils.ts                    — Arc geometry calculations
    ├── sounds.ts                       — Sound effects
    ├── hooks/use-geolocation.ts        — Browser geolocation hook
    ├── simulation/latency.ts           — Distance-based latency estimation
    └── store/                          — Zustand stores (6 files)
        ├── database-store.ts           — Primary + read replica config
        ├── write-flow-store.ts         — Write animation state
        ├── read-flow-store.ts          — Read animation state
        ├── consistency-race-store.ts   — Consistency race state
        ├── failover-store.ts           — Failover + leader election
        └── onboarding-store.ts         — Welcome/progress (persisted)
```
