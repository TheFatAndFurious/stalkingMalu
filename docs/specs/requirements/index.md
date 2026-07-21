# Specifications — Level 2: Requirements

The *what*, measurable. Each functional requirement traces up to a use case (Level 1); each
technical specification (Level 3) will trace down to a requirement here. The non-functional
requirements are the real design drivers — the **Drives** column names the decision each
one produced, which is what makes the architecture defensible rather than arbitrary.

Numeric targets marked ◇ are **starter values to ratify** — they are the actual decisions,
not incidental figures.

---

## Functional requirements

### Device

| ID | Requirement | Traces to |
|----|-------------|-----------|
| FR-01 | Sample GPS position and temperature at a configurable rate (default 1 Hz). | UC-DEV-01 |
| FR-02 | Publish readings while connected, wrapped in the versioned envelope (messageId, deviceId, messageType, schemaVersion, deviceTime, payload). | UC-DEV-02 |
| FR-03 | Persist readings to a durable local outbox before transmission, surviving power loss. | UC-DEV-03 |
| FR-04 | On reconnection, publish the most recent GPS fix first (latest-wins), then drain history via the backfill path. | UC-DEV-03 |
| FR-05 | Apply per-message-type retention: GPS latest-wins/compacted, temperature keep-all until acknowledged. | UC-DEV-03 |
| FR-06 | Announce "online" on connect; register a Last Will so the broker announces "offline" on ungraceful disconnect. | UC-DEV-04 |
| FR-07 | Retrieve retained configuration on (re)connect and apply the sampling rate. | UC-DEV-05 |

### Ingestion & integrity

| ID | Requirement | Traces to |
|----|-------------|-----------|
| FR-08 | Route malformed or unauthorized messages to a dead-letter queue with a typed failure reason. | UC-OP-04 |
| FR-09 | Deduplicate messages by messageId (at-least-once delivery). | UC-FM-01, integrity |
| FR-10 | Reject any message whose envelope deviceId does not match the authenticated topic. | UC-OP-01, integrity |
| FR-11 | Stamp an ingest timestamp on receipt, preserved alongside deviceTime downstream. | UC-FM-06, integrity |
| FR-12 | Accept a new measurement type without breaking existing consumers; consumers ignore unknown types and fields. | cross-cutting (extensibility) |

### Alerting

| ID | Requirement | Traces to |
|----|-------------|-----------|
| FR-13 | Raise an alert when temperature crosses a configured threshold, with hysteresis. | UC-FM-03 |
| FR-14 | Raise an alert on geofence entry/exit, filtering GPS jitter (fix quality + consecutive points). | UC-FM-04 |
| FR-15 | Raise an alert when a device goes silent, via LWT (fast) and a data-plane watchdog (exhaustive). | UC-FM-05 |
| FR-16 | Deliver alerts through the notification channel (Telegram) in V1, not in-app. | UC-FM-03/04/05 |

### Presentation

| ID | Requirement | Traces to |
|----|-------------|-----------|
| FR-17 | Display each asset's current position on a real-time map. | UC-FM-01 |
| FR-18 | On client connection, provide a snapshot of the last known position of every asset, then stream live updates. | UC-FM-01 |
| FR-19 | Indicate each device's connection status (online / offline / stale) on the map. | UC-FM-02 |

### Operations

| ID | Requirement | Traces to |
|----|-------------|-----------|
| FR-20 | Authenticate each device with unique credentials, authorized to publish only under its own subtree. | UC-OP-01 |
| FR-21 | Update a device's configuration (sampling rate) remotely via retained config. | UC-OP-02 |
| FR-22 | Expose broker, bridge, Kafka, and backlog-depth health for supervision. | UC-OP-03 |
| FR-23 | Provide a consumer/supervision path for the dead-letter queue. | UC-OP-04 |

---

## Non-functional requirements (measurable scenarios)

### Real-time & latency

| ID | Scenario | Target | Drives |
|----|----------|--------|--------|
| NFR-01 | A connected device publishes a position → it appears on the map. | ≤ 2 s p95 ◇ | WebSocket gateway (not polling); ~1 Hz throttle. |
| NFR-02 | A device reconnects with 100 000 buffered messages → its current position becomes visible. | ≤ 5 s ◇ | **Latest-wins prioritized replay + live/backfill topic split (ADR-001).** The scenario that ruled out Mosquitto FIFO. |
| NFR-03 | While a reconnection backlog drains → live telemetry keeps flowing. | backfill never blocks live | live/backfill separation, parallel drain. |

### Durability & offline

| ID | Scenario | Target | Drives |
|----|----------|--------|--------|
| NFR-04 | A brutal power cut occurs → most-recent uncommitted readings lost. | ≤ 60 s ◇ | **SQLite WAL commit + fsync/batch tuning (ADR-001).** Ruled out Mosquitto snapshot persistence. |
| NFR-05 | A device is offline ≥ 48 h → compliance-critical (temperature) readings retained up to storage cap, resumed without loss. | 0 loss within cap ◇ | keep-all temperature retention; bounded storage cap. |

### Reliability & correctness

| ID | Scenario | Target | Drives |
|----|----------|--------|--------|
| NFR-06 | QoS-1 redelivery duplicates a message → duplicate reaches the alert engine. | never; dedup window ≥ 10 min ◇ | bridge dedup cache (Redis); messageId in envelope. |
| NFR-07 | A single malformed message arrives → ingestion crashes. | never; message quarantined | Either-based decode; DLQ; typed MessageDecodeError. |
| NFR-08 | A reading older than the freshness bound triggers an alert. | never; bound = 10 min ◇ | alert engine reasons in event time (deviceTime); suppresses stale backlog. |
| NFR-09 | A value oscillates around a threshold → repeated alerts. | never (flap-free) | hysteresis (distinct entry/exit); geofence N consecutive fixes + HDOP filter. |

### Detection latency

| ID | Scenario | Target | Drives |
|----|----------|--------|--------|
| NFR-10 | A device's connection drops → it is flagged offline. | ≤ ~90 s (1.5 × keepalive 60 s) ◇ | keepalive value (SESSION); LWT. |
| NFR-11 | A device stays connected but stops emitting → it is flagged. | ≤ 5 min ◇ | data-plane watchdog (the second, exhaustive detector). |

### Security & privacy

| ID | Scenario | Target | Drives |
|----|----------|--------|--------|
| NFR-12 | A device tries to publish outside its subtree, or attribute data to another device. | rejected | EMQX per-device auth + ACL; assertDeviceMatches invariant. |
| NFR-13 | Any party attempts to reach Kafka from outside the internal network. | impossible | two-boundary architecture (bridge in, gateway out). |
| NFR-14 | A fleet manager requests assets they are not authorized for. | denied | gateway per-user authz (Kafka has no row-level access). |
| NFR-15 | Telemetry linking a position to a driver is stored → retention. | bounded by policy ◇ | Kafka/Timescale retention; GDPR. |

### Scalability & extensibility

| ID | Scenario | Target | Drives |
|----|----------|--------|--------|
| NFR-16 | Reference load. | 5–10 devices @ 1 Hz (V1) | modest sizing, explicit. |
| NFR-17 | Ingestion throughput exceeds one bridge instance → scale out. | no device change | MQTT shared subscriptions; deviceId partition key. |
| NFR-18 | A new measurement type or optional field is deployed. | no consumer breakage (deploy consumers before producers) | discriminated union + schemaVersion; ignore-unknown rule. |

### Observability

| ID | Scenario | Target | Drives |
|----|----------|--------|--------|
| NFR-19 | An operator needs device backlog health. | backlog depth observable | SQLite unsent-row count as metric. |
| NFR-20 | Downstream needs to reason about late/replayed data. | deviceTime + ingestTime preserved end-to-end | bridge stamps ingestTime. |

---

## From requirement to decision

Several NFRs above already have a home in an ADR (NFR-02/04 → ADR-001). Others still owe an
ADR: MQTT-vs-REST (drives NFR-10/12/13), the notification-channel choice, the alert-engine
state store, and the DLQ consumer (FR-23 has no realizing component yet — a requirement
without a component is the signal we look for). The traceability chain is:

> use case → requirement → decision (ADR) → component (Level 3)

A break anywhere in that chain is a finding: over-engineering if a component traces to
nothing, a gap if a requirement realizes into nothing.