# ADR-001: Offline Data Handling Strategy (SQLite Store-and-Forward Outbox)

## Status

**Accepted**

Supersedes the earlier draft that relied on the local Mosquitto broker queue.

## Context

The IoT devices (Raspberry Pi, running a TypeScript/Effect agent in the Nx monorepo,
`apps/agent-pi`) operate over mobile networks (4G) and will inevitably experience
prolonged disconnections — trucks in dead zones or tunnels, boats at sea. We must define
how the device buffers telemetry while offline and how it flushes on reconnection.

Two business needs pull in opposite directions:

- **Real-time tracking (freshness-critical, history-disposable).** Positional data loses
  value over time. When a truck reconnects after 3 hours, its position 2 hours ago is
  usually worthless; we care about its *current* state, and we want it on the map as fast
  as possible.
- **Regulatory compliance / cold chain (completeness-critical).** For sensitive payloads
  (e.g. human blood, pharmaceuticals), every temperature reading is legally required. No
  data loss is acceptable.

Two environmental constraints shape the decision:

- **Brutal power loss is the characteristic failure mode.** Ignition off cuts power
  without warning. Durability must survive a hard power cut, not merely a graceful
  process restart.
- **SD card write endurance** is a real but manageable concern.

Key realization: freshness-first and completeness are **not** in conflict. They only
appear to be under a single global buffering policy. The real design axis is
**FIFO replay vs. prioritized replay**, and **who controls retention**. Once retention is
a *per-message-type* policy, one mechanism serves both needs.

## Decision

We will implement a **durable local outbox in SQLite (WAL mode)** as the single
store-and-forward mechanism on the device.

- Telemetry is written to an append-only table on capture. A forwarder reads unsent rows,
  publishes with **QoS 1**, and marks them sent on `PUBACK` (idempotent mark-sent).
- **Retention and replay are policies keyed by message type**, not global:
  - **GPS — "latest-wins".** On reconnection the most recent fix is published
    *immediately* to a live topic (prioritized replay). Older GPS rows are
    compacted/discarded under a bounded retention (keep last *T*, or downsample to a lower
    rate). The map shows the current position within seconds; stale intermediate points
    are not replayed FIFO.
  - **Temperature — "keep-all".** Full retention until acknowledged delivery. Nothing is
    dropped. Backfill drains on a secondary path without blocking the live GPS path.
- **Durability:** rows are committed (WAL) so data survives a hard power cut. `fsync` and
  batching are tuned to bound the worst-case loss window to a defined tolerance (e.g.
  ≤ *N* seconds of the very latest, not-yet-committed writes).
- **Bounded storage:** explicit retention caps per message type prevent unbounded growth
  on the SD card; the GPS backlog is compacted.
- The outbox database doubles as the device's **local state store** (last-known-good
  config, pending commands, applied config), consistent with the config-not-code and
  DNS-resolved-endpoint decisions.

The outbox lives behind a hexagonal port (`TelemetryBuffer`); replay and retention
policies are pure functions, exercised by the device simulator injecting outages.

## Alternatives Considered

**1. Local Mosquitto broker queue (`clean_session = false`, QoS 1, `max_queued_messages`).**
Rejected. When the per-client queue is full, Mosquitto **silently drops the newest**
incoming `PUBLISH` and keeps the oldest — there is no "keep-latest" mode. This inverts the
freshness-first priority: once the queue fills (e.g. 100 messages ≈ 100 s at 1 Hz), the
*current* position is discarded on arrival while stale positions are replayed FIFO on
reconnection. It serves neither use case — tracking loses the fresh data it cares about,
and compliance loses data once the cap is hit. The queue is also in RAM and lost on a hard
power cut unless `persistence` is enabled, and that is a periodic *snapshot* (not a
journal) that rewrites the whole DB on each autosave (its own SD-wear cost). Finally,
`clean_session = false` is by definition stateful, so it does not deliver the "stateless
edge" it appears to promise.

**2. Fire-and-forget / no local buffer (drop on disconnect).**
Rejected. Fails compliance entirely, and even for tracking it loses the current position
acquired *during* the outage.

**3. Cloud-side buffering only.**
Rejected. The network is precisely what is unavailable during an outage; buffering must
live on the device.

**4. Full time-series DB on the edge (embedded Postgres / Timescale).**
Rejected. Over-engineered for a Raspberry Pi. SQLite is sufficient, lighter on RAM/CPU,
and single-file.

## Consequences

### Positive

- **Freshness-first is actually achieved.** Current GPS is visible within seconds of
  reconnection via prioritized live replay — the stated top priority, which the Mosquitto
  approach structurally could not deliver.
- **Both business use cases served by one mechanism**, differentiated only by per-type
  retention. No second subsystem, no future special-casing.
- **Cold-chain ready from day one.** Onboarding a pharma client requires only a retention
  config change (temperature = keep-all), not an architecture change.
- **Durable across brutal power loss** (WAL commit), with a bounded, explicit loss window
  instead of a silent snapshot gap.
- **Observable buffer.** A count of unsent rows is a device-health signal; backlog depth
  is monitorable.
- **Testable in isolation.** Behind a hexagonal port, with replay policies as pure
  functions driven by the simulator.
- **Reused as local state store** for config and pending commands.

### Negative / Costs

- **Real code to own:** reconnection, backoff, in-flight/ack tracking, idempotent
  mark-sent. Mosquitto provided some of this via configuration.
- **At-least-once delivery** (QoS 1) requires the ingestion side to **deduplicate** — the
  message envelope must carry a stable message id.
- **SD write I/O** (mitigated: WAL, batched commits, tuned `fsync`, industrial-grade
  SD/eMMC).
- **Retention policy must be defined per message type up front** — a modest design cost,
  and arguably a feature.