# Specifications — Level 1: Actors & Use Cases

The *why* of the system. Every technical specification (Level 3) must trace back, through a
requirement (Level 2), to a use case listed here. A component that traces to nothing is a
signal: either over-engineering, or a missing requirement.

## System scope

An IoT fleet-tracking platform: heterogeneous mobile assets carry a sensor device (GPS,
temperature) that transmits telemetry in near-real-time to a backend, which surfaces live
positions on a map and raises alerts on abnormal conditions — designed to accept new
measurement types without rework.

## Actors

**Human actors**

- **Fleet Manager** — the primary beneficiary. *Uses* the platform: consults live
  positions, is notified of abnormal conditions. Does not operate the infrastructure.
- **Platform Operator** — us. *Runs* the platform: provisions devices,
  configures them, supervises health, handles the dead-letter queue, deploys updates.


**System actors**

- **Device** — the sensor box on an asset. Acts autonomously: collects readings, buffers
  them across outages, transmits, reports its connection state, fetches its configuration.
  Modeled as an actor because it initiates behaviour on its own, not on human command.

**Secondary (external) actors** — called *by* the system, no use cases of their own:

- **Notification Channel** (Telegram in V1) — receives alert notifications.
- **Satellite Network** (Kinéis — future) — alternate uplink during 4G loss.

## Use case catalogue

Priority: **M**ust / **S**hould / **C**ould / **W**on't (this release).

### Fleet Manager

| ID | Use case | Prio | Description |
|----|----------|:----:|-------------|
| UC-FM-01 | View live fleet position | **M** | See each asset's current position on a real-time map. |
| UC-FM-02 | See device connection status | S | Distinguish online / offline / stale assets on the map. |
| UC-FM-03 | Be alerted on temperature threshold | S | Receive a notification when a reading crosses a configured bound. |
| UC-FM-04 | Be alerted on zone entry/exit | S | Receive a notification when an asset enters/leaves a geofence. |
| UC-FM-05 | Be notified when a device goes silent | S | Receive a notification when an asset stops reporting. |
| UC-FM-06 | Consult an asset's trip history | C | Replay the past path of an asset. *(V2)* |

### Platform Operator

| ID | Use case | Prio | Description |
|----|----------|:----:|-------------|
| UC-OP-01 | Provision a new device | **M** | Issue a device identity and credentials so it can authenticate and publish only under its own subtree. |
| UC-OP-02 | Configure a device remotely | S | Adjust sampling rate (and later thresholds) via retained config, applied on reconnect. |
| UC-OP-03 | Supervise platform health | S | Monitor broker, bridge, Kafka, and backlog depth. |
| UC-OP-04 | Inspect and handle rejected messages | S | Review the dead-letter queue and diagnose why messages failed. |
| UC-OP-05 | Deploy an agent update | C | Roll out a new agent version to devices (manual, canary-first in V1). |
| UC-OP-06 | Configure alert rules via UI | **W** | Manage thresholds/geofences through an interface. *(V1 uses static config.)* |

### Device

| ID | Use case | Prio | Description |
|----|----------|:----:|-------------|
| UC-DEV-01 | Collect sensor readings | **M** | Sample GPS and temperature at a configurable rate. |
| UC-DEV-02 | Transmit in near-real-time | **M** | Publish readings promptly while connected. |
| UC-DEV-03 | Buffer offline, forward on reconnect | **M** | Persist readings durably across outages and power loss; on reconnect, publish the freshest position first, then backfill (per ADR-001). |
| UC-DEV-04 | Report connection status | **M** | Announce online on connect; the broker announces offline via Last Will on ungraceful disconnect. |
| UC-DEV-05 | Fetch and apply configuration | S | Retrieve retained config on (re)connect and apply it. |
| UC-DEV-06 | Fall back to satellite uplink | **W** | Transmit a reduced payload over satellite during prolonged 4G loss. *(Future.)* |

## Out of scope (this release)

Industrial provisioning at scale, robust A/B OTA, device shadow (desired/reported
reconciliation), map-matching, long-term retention / historical store, multi-tenancy,
in-app alert display, ESP32 / satellite transports.

## Learning constraints (not derived from a use case)

Kafka, Effect, hexagonal architecture, and the Nx/Bun toolchain are deliberate learning
choices, not requirements dictated by a use case. They are recorded here explicitly so
that "Kafka is oversized for 10 devices" reads as an owned, dated decision rather than a
sizing error.