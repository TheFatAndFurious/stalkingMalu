import { Option } from "effect"

// ── Namespace ────────────────────────────────────────────────
export const NAMESPACE = "fleet"
export const VERSION = "v1"
const PREFIX = `${NAMESPACE}/${VERSION}`

// ── Builders (pures) ─────────────────────────────────────────
// Param `string` par simplicité ; tu peux le resserrer en `DeviceId`
// pour forcer un id validé au call site.
export const telemetryTopic = (deviceId: string) => `${PREFIX}/${deviceId}/telemetry`
export const backfillTopic  = (deviceId: string) => `${PREFIX}/${deviceId}/telemetry/backfill`
export const statusTopic    = (deviceId: string) => `${PREFIX}/${deviceId}/status`
export const configTopic    = (deviceId: string) => `${PREFIX}/${deviceId}/config`
export const commandsTopic  = (deviceId: string) => `${PREFIX}/${deviceId}/commands` // réservé V2

// ── Patterns d'abonnement / ACL ──────────────────────────────
/** Télémétrie live, tous devices — la live-gateway s'abonne ici (live seul). */
export const LIVE_TELEMETRY_WILDCARD = `${PREFIX}/+/telemetry`
/** Live + backfill, tous devices — le bridge s'abonne ici. */
export const TELEMETRY_TREE_WILDCARD = `${PREFIX}/+/telemetry/#`
/** Status, tous devices — le bridge s'abonne ici (online + LWT). */
export const STATUS_WILDCARD = `${PREFIX}/+/status`
/** ACL publish par device : ne peut publier que sous son propre sous-arbre. */
export const deviceAclPattern = (deviceId: string) => `${PREFIX}/${deviceId}/#`

// ── Parser (inverse des builders) ────────────────────────────
export type TopicKind = "telemetry" | "telemetry-backfill" | "status" | "config"

export interface ParsedTopic {
    readonly deviceId: string // string de routage brut ; le brand se fait au décodage
    readonly kind: TopicKind
}

export const parseTopic = (topic: string): Option.Option<ParsedTopic> => {
    const [ns, ver, deviceId, ...rest] = topic.split("/")
    if (ns !== NAMESPACE || ver !== VERSION || !deviceId) return Option.none()

    switch (rest.join("/")) {
        case "telemetry":          return Option.some({ deviceId, kind: "telemetry" })
        case "telemetry/backfill": return Option.some({ deviceId, kind: "telemetry-backfill" })
        case "status":             return Option.some({ deviceId, kind: "status" })
        case "config":             return Option.some({ deviceId, kind: "config" })
        default:                   return Option.none()
    }
}