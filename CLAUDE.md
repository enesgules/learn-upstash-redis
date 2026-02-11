# Learn Upstash Redis - Interactive Learning Platform

An interactive, visual learning platform that teaches Upstash Redis global replication concepts through hands-on 3D experiences.

## Project Overview

**Target Audience:** Developers new to backend/distributed systems concepts and Upstash Redis.

**Core Idea:** Users interact with a 3D globe to see how Upstash Redis global replication works — writing data, watching it replicate across regions, seeing latency differences, and understanding eventual consistency — all simulated in the browser.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 (Upstash branding: dark theme, emerald green accents)
- **3D:** React Three Fiber (`@react-three/fiber`) + Drei (`@react-three/drei`)
- **Animations:** Framer Motion (UI panels), R3F useFrame (3D animations)
- **State:** Zustand (simulation state shared between UI panels and 3D scene)
- **Data:** All simulated client-side (no real Redis connection for now)

## Upstash Branding

- **Background:** Dark (`#0a0a0a`, zinc-950)
- **Accent:** Emerald green (`emerald-400`, `emerald-500`)
- **Buttons:** `bg-emerald-400/10 text-emerald-500 hover:bg-emerald-700/20 rounded-full`
- **Text:** `text-zinc-50` (primary), `text-zinc-400` (muted)
- **Fonts:** Geist Sans / Geist Mono (already configured)

## Upstash Redis Concepts (from docs)

### Single Leader Replication
- One **primary region** handles all writes
- Multiple **read regions** serve read-only traffic
- Writes replicate asynchronously from primary → all read replicas

### Write Path
- Write command → sent to primary region → processed → response returned
- Replication to read replicas happens **after** the write is confirmed
- This is why writes are fast (only primary needs to confirm)

### Read Path
- Read command → automatically routed to **nearest** read region
- Sub-millisecond latency when reading from same AWS region
- No need to go to primary for reads

### Eventual Consistency
- After a write, read replicas may briefly return stale data
- Replication lag depends on geographic distance
- "Last write wins" conflict resolution

### High Availability & Failover
- Regional failures don't cause downtime — requests route to alternate regions
- If primary fails → **leader election** → brief unavailability → new primary selected
- Read replicas continue serving (possibly stale) reads during failover

### Available Regions (14 AWS + 3 GCP)

**AWS Regions:**
| Region Code      | Abbreviation | Location                 | Lat      | Lon       |
|------------------|-------------|--------------------------|----------|-----------|
| us-east-1        | us1         | N. Virginia, USA         | 39.0438  | -77.4874  |
| us-east-2        | use2        | Ohio, USA                | 40.4173  | -82.9071  |
| us-west-1        | us2         | N. California, USA       | 37.3382  | -121.8863 |
| us-west-2        | us3         | Oregon, USA              | 45.5152  | -122.6784 |
| ca-central-1     | cac1        | Montreal, Canada         | 45.5017  | -73.5673  |
| eu-west-1        | eu1         | Ireland                  | 53.3498  | -6.2603   |
| eu-west-2        | euw2        | London, UK               | 51.5074  | -0.1278   |
| eu-central-1     | eu2         | Frankfurt, Germany       | 50.1109  | 8.6821    |
| ap-south-1       | as1         | Mumbai, India            | 19.0760  | 72.8777   |
| ap-northeast-1   | apn1        | Tokyo, Japan             | 35.6762  | 139.6503  |
| ap-southeast-1   | ap1         | Singapore                | 1.3521   | 103.8198  |
| ap-southeast-2   | ap2         | Sydney, Australia        | -33.8688 | 151.2093  |
| sa-east-1        | sa1         | São Paulo, Brazil        | -23.5505 | -46.6333  |
| af-south-1       | afs1        | Cape Town, South Africa  | -33.9249 | 18.4241   |

**GCP Regions:**
| Region Code      | Abbreviation | Location                 | Lat      | Lon       |
|------------------|-------------|--------------------------|----------|-----------|
| us-east4          | use4        | Ashburn, Virginia, USA   | 39.0438  | -77.4874  |
| us-central1       | usc1        | Council Bluffs, Iowa, USA| 41.2619  | -95.8608  |
| europe-west1      | euw1        | St. Ghislain, Belgium    | 50.4697  | 3.8110    |

---

## Implementation Plan

We build **6 experiences** sequentially. Each is self-contained and builds on shared components.

---

### Experience 1: Interactive 3D Globe with Region Markers

**Goal:** Establish the visual foundation — a beautiful 3D globe with all 12 Upstash regions plotted as interactive markers.

**What the user sees:**
- Full-screen dark background with a slowly rotating 3D Earth
- 12 glowing emerald dots on the globe at real AWS region locations
- Hover a dot → tooltip shows region name + location
- Click a dot → info panel appears with region details
- Smooth orbit controls (drag to rotate, scroll to zoom)

**Key components:**
- `Globe` — Three.js sphere with Earth texture/stylized wireframe
- `RegionMarker` — Glowing point on globe surface (lat/lon → 3D position)
- `RegionTooltip` — HTML overlay via Drei's `<Html>` component
- `GlobeScene` — R3F Canvas + lighting + controls

**Technical notes:**
- Use Drei's `<OrbitControls>` for camera interaction
- Convert lat/lon to 3D coordinates: `latLonToVector3(lat, lon, radius)`
- Globe style: dark sphere with subtle grid lines or continent outlines (not photorealistic)
- Region markers: small spheres with emissive emerald glow + point light

**Files:**
```
src/
  components/
    globe/
      GlobeScene.tsx        — Canvas wrapper (client component with 'use client')
      Globe.tsx              — The sphere mesh
      RegionMarker.tsx       — Single region dot on globe
      RegionTooltip.tsx      — Hover tooltip
  lib/
    regions.ts              — Region data (name, code, lat, lon, description)
    geo-utils.ts            — latLonToVector3, distance calculations
  app/
    page.tsx                — Landing page with globe
```

---

### Experience 2: Region Builder — Primary + Read Regions

**Goal:** User designates a primary region and adds read regions, watching the network topology form on the globe.

**What the user sees:**
- Globe from Experience 1
- Side panel: "Build Your Database" with region list
- User clicks a region on globe or panel → "Set as Primary" (turns gold/yellow)
- User clicks more regions → "Add as Read Region" (stay emerald)
- Animated arc connections draw from primary to each read region
- Latency estimates appear on each connection (based on geographic distance)
- A "Global Latency" indicator shows average read latency improving as regions are added

**Key components:**
- `RegionBuilder` (panel) — UI for selecting primary + read regions
- `ConnectionArc` — Animated curved line between two regions on globe
- `LatencyIndicator` — Shows estimated ms on each arc
- `LatencyHeatmap` — Color overlay on globe showing read latency from any point

**State (Zustand store):**
```ts
interface DatabaseState {
  primaryRegion: string | null
  readRegions: string[]
  setPrimary: (regionId: string) => void
  addReadRegion: (regionId: string) => void
  removeReadRegion: (regionId: string) => void
}
```

**Simulated latency formula:**
- `latency = baseLatency + (distanceKm / speedOfLightKm) * 2 * networkOverhead`
- Where `networkOverhead ≈ 3-5x` to simulate real network conditions

**Files:**
```
src/
  components/
    globe/
      ConnectionArc.tsx     — Curved line between two points on globe
      LatencyLabel.tsx      — "45ms" label floating on arc
    panels/
      RegionBuilder.tsx     — Side panel UI for building database
      LatencyStats.tsx      — Summary stats panel
  lib/
    simulation/
      latency.ts            — Distance-based latency calculation
    store/
      database-store.ts     — Zustand store for region configuration
```

---

### Experience 3: Write Flow Visualization

**Goal:** User writes a key/value and watches the data travel from their location to the primary, then fan out to all replicas.

**What the user sees:**
- Globe with configured regions (from Experience 2)
- Bottom panel: Redis CLI-style input (`SET mykey "hello"`)
- User picks their "client location" by clicking anywhere on globe
- User hits "Execute" → animated data packet (glowing orb) travels:
  1. Client location → Primary region (with latency timer)
  2. Primary confirms → "OK" response (green flash on primary)
  3. Primary → fans out to ALL read regions simultaneously (async replication)
  4. Each replica lights up green as it receives the data
- Timeline bar at bottom shows the sequence of events with timestamps
- Key insight highlighted: "Write confirmed after 12ms, but replication takes 45-120ms"

**Key components:**
- `DataPacket` — Animated glowing sphere that travels along arcs
- `RedisTerminal` — CLI-style input panel for Redis commands
- `WriteTimeline` — Horizontal timeline showing event sequence
- `ClientMarker` — User's simulated position on globe

**Animation sequence (managed by simulation engine):**
1. Spawn packet at client position
2. Animate along arc to primary (duration = simulated latency)
3. Flash primary marker green
4. Show "OK" response in terminal
5. Spawn N packets from primary to each read region (staggered by distance)
6. Flash each replica as packet arrives
7. Update timeline with all timestamps

**Files:**
```
src/
  components/
    globe/
      DataPacket.tsx        — Animated traveling orb
      ClientMarker.tsx      — User's position marker
    panels/
      RedisTerminal.tsx     — Command input UI
      WriteTimeline.tsx     — Event timeline visualization
  lib/
    simulation/
      write-flow.ts         — Orchestrates write animation sequence
      animation-engine.ts   — Core timing/sequencing engine
    store/
      simulation-store.ts   — Current simulation state (packets in flight, etc.)
```

---

### Experience 4: Read Flow — Nearest Region Routing

**Goal:** User reads data and sees it served from the nearest replica, with a latency comparison.

**What the user sees:**
- Globe with configured regions + stored data (from Experience 3)
- User moves their client position to different locations on globe
- User executes `GET mykey` → packet travels to nearest replica (highlighted)
- Split view comparison: "Read from nearest (12ms) vs Read from primary (89ms)"
- As user drags their position around the globe, the "nearest region" changes in real-time
- Voronoi-style overlay shows which region "owns" each area of the globe

**Key components:**
- `NearestRegionHighlight` — Highlights which replica will serve the read
- `LatencyComparison` — Side-by-side comparison UI
- `DraggableClient` — User can drag their position on globe
- `VoronoiOverlay` — Optional: colored regions showing nearest-replica zones

**Files:**
```
src/
  components/
    globe/
      DraggableClient.tsx   — Draggable client position
      VoronoiOverlay.tsx    — Region ownership visualization
    panels/
      LatencyComparison.tsx — Compare nearest vs primary read
  lib/
    simulation/
      read-flow.ts          — Orchestrates read animation
      nearest-region.ts     — Find closest replica to a point
```

---

### Experience 5: Eventual Consistency Race

**Goal:** Demonstrate that reads can return stale data during replication. The "aha moment" for understanding eventual consistency.

**What the user sees:**
- Globe with primary (US-East-1) and a distant read region (AP-Southeast-2 Sydney)
- Auto-sequence: write to primary, then immediately read from Sydney
- Globe shows replication wave expanding from primary
- If the read arrives at Sydney BEFORE the replication packet → shows OLD value (red flash, "stale!")
- If the read arrives AFTER → shows NEW value (green flash, "fresh!")
- User controls a "read delay" slider (0ms - 200ms after write)
- At low delays → almost always stale. At high delays → almost always fresh.
- Visual: replication wave as an expanding ring on the globe surface

**Key components:**
- `ReplicationWave` — Expanding ring/pulse from primary across globe
- `ConsistencyRace` — Panel showing the write vs read race
- `DelaySlider` — Control when the read fires after the write
- `StalenessMeter` — Shows probability of stale read at current delay

**Key insight:** "Eventual consistency means your read might be stale for a few milliseconds after a write. The further your read region is from the primary, the longer this window lasts."

**Files:**
```
src/
  components/
    globe/
      ReplicationWave.tsx   — Expanding ring animation
    panels/
      ConsistencyRace.tsx   — Race condition visualizer
      DelaySlider.tsx       — Control read timing
      StalenessMeter.tsx    — Staleness probability gauge
  lib/
    simulation/
      consistency-race.ts   — Race condition simulation logic
```

---

### Experience 6: Failover & Leader Election

**Goal:** Show what happens when the primary region fails and a new leader is elected.

**What the user sees:**
- Globe with healthy cluster (all regions green/emerald)
- "Kill Primary" button → primary region turns red, connection arcs break
- Incoming write requests queue up (shown as packets bouncing/waiting)
- Leader election animation: remaining regions "vote" (pulses between them)
- One region lights up gold → new primary elected
- Connections re-establish, queued writes resume
- Timeline shows: failure detected → election started → new leader → recovery complete
- Total downtime counter (simulated ~1-3 seconds)

**Key components:**
- `FailureAnimation` — Region goes red, sparks/break effect
- `ElectionAnimation` — Voting pulses between candidate regions
- `RequestQueue` — Visual queue of waiting requests
- `FailoverTimeline` — Timeline of failover events

**Files:**
```
src/
  components/
    globe/
      FailureAnimation.tsx  — Region failure visual
      ElectionAnimation.tsx — Leader election visual
    panels/
      FailoverControls.tsx  — Kill/restore buttons
      FailoverTimeline.tsx  — Event timeline
  lib/
    simulation/
      failover.ts           — Failover simulation logic
```

---

## Shared Infrastructure

### Simulation Engine (`src/lib/simulation/animation-engine.ts`)
- Event queue with timing
- Manages packet animations, state transitions
- Drives all experiences consistently

### Zustand Stores (`src/lib/store/`)
- `database-store.ts` — Region configuration (primary + read regions)
- `simulation-store.ts` — Active simulation state (packets, events, timeline)

### Shared Components
- `src/components/globe/*` — All globe-related 3D components
- `src/components/ui/*` — Shared UI (buttons, panels, sliders matching Upstash brand)
- `src/components/layout/*` — Page layout, navigation between experiences

### Utility Functions (`src/lib/`)
- `regions.ts` — All 12 region data with coordinates
- `geo-utils.ts` — Lat/lon math, distance calculations
- `simulation/latency.ts` — Realistic latency simulation

---

## Page Structure

```
/                   — Landing page: hero + globe preview + links to experiences
/learn/globe        — Experience 1: Explore the Globe
/learn/regions      — Experience 2: Build Your Database
/learn/write        — Experience 3: Write Flow
/learn/read         — Experience 4: Read Flow
/learn/consistency  — Experience 5: Eventual Consistency
/learn/failover     — Experience 6: Failover & Leader Election
```

Each `/learn/*` page shares the globe but adds its own UI panels and simulation logic.

---

## Implementation Order

1. **Experience 1** — Globe foundation (everything depends on this)
2. **Experience 2** — Region builder (sets up state for 3-6)
3. **Experience 3** — Write flow (introduces data packets + animation engine)
4. **Experience 4** — Read flow (reuses packets, adds nearest-region logic)
5. **Experience 5** — Consistency race (builds on write + read)
6. **Experience 6** — Failover (most complex, builds on everything)

Each experience is a standalone PR/milestone. We implement and polish one before moving to the next.
