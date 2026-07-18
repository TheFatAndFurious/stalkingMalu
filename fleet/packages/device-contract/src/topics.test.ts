import { describe, expect, it } from "vitest"
import { Option } from "effect"
import {
    telemetryTopic, backfillTopic, statusTopic, configTopic,
    parseTopic, NAMESPACE, VERSION,
} from "../src/index.js"

describe("builders → parser (aller-retour)", () => {
    const id = "truck-042"

    it("telemetry se reparse en kind telemetry", () => {
        const p = parseTopic(telemetryTopic(id))
        expect(Option.isSome(p)).toBe(true)
        if (Option.isSome(p)) {
            // oxlint-disable-next-line vitest/no-conditional-expect
            expect(p.value.deviceId).toBe(id)
            // oxlint-disable-next-line vitest/no-conditional-expect
            expect(p.value.kind).toBe("telemetry") // ⚠️ vérifie ta valeur exacte de TopicKind
        }
    })

    it("distingue backfill de telemetry", () => {
        const p = parseTopic(backfillTopic(id))
        // oxlint-disable-next-line vitest/no-conditional-expect
        if (Option.isSome(p)) expect(p.value.kind).toBe("telemetry-backfill") // ⚠️ idem
        else throw new Error("backfill aurait dû parser")
    })

    it("reparse status et config", () => {
        expect(Option.isSome(parseTopic(statusTopic(id)))).toBe(true)
        expect(Option.isSome(parseTopic(configTopic(id)))).toBe(true)
    })
})

describe("parser — rejets", () => {
    it("rejette un mauvais namespace", () => {
        expect(Option.isNone(parseTopic(`autre/${VERSION}/truck-042/telemetry`))).toBe(true)
    })
    it("rejette une mauvaise version", () => {
        expect(Option.isNone(parseTopic(`${NAMESPACE}/v99/truck-042/telemetry`))).toBe(true)
    })
    it("rejette un topic hors grammaire", () => {
        expect(Option.isNone(parseTopic(`${NAMESPACE}/${VERSION}/truck-042/n-importe-quoi`))).toBe(true)
    })
})