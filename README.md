# Learn Upstash Redis

An interactive 3D learning platform that teaches Upstash Redis global replication concepts through hands-on visual experiences.

## What is this?

Distributed databases are hard to understand from docs alone. This platform lets you **see** how Upstash Redis global replication works by interacting with a 3D globe:

- **Build a database** — Pick a primary region and add read replicas across the globe
- **Write data** — Watch your data travel to the primary and replicate to all regions
- **Read data** — See how reads route to the nearest replica for lowest latency
- **Break things** — Kill a region and watch leader election and failover in action
- **Race conditions** — Understand eventual consistency by racing writes against reads

## Tech Stack

- Next.js 16 + React 19 + TypeScript
- React Three Fiber + Drei (3D globe visualization)
- Tailwind CSS v4 (Upstash branding)
- Zustand (simulation state)
- Framer Motion (UI animations)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start exploring.

## Experiences

| # | Experience | Concept Taught |
|---|-----------|----------------|
| 1 | Interactive Globe | Upstash's 12 global AWS regions |
| 2 | Region Builder | Primary vs read regions, network topology |
| 3 | Write Flow | Single-leader writes, async replication |
| 4 | Read Flow | Nearest-region routing, latency optimization |
| 5 | Consistency Race | Eventual consistency, stale reads |
| 6 | Failover | Leader election, high availability |

## Project Structure

```
src/
  app/                    — Next.js pages (landing + /learn/* experiences)
  components/
    globe/                — 3D globe, region markers, data packets, arcs
    panels/               — UI panels (terminal, timeline, controls)
    ui/                   — Shared UI components (buttons, sliders)
    layout/               — Page layout, navigation
  lib/
    regions.ts            — 12 AWS region data with coordinates
    geo-utils.ts          — Lat/lon to 3D coordinate math
    simulation/           — Animation engine, latency calc, flow logic
    store/                — Zustand stores for database + simulation state
```
