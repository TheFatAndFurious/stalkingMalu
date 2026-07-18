import { describe, expect, it } from "vitest"
import { Either } from "effect"
import { assertDeviceMatches, telemetryTopic } from "../src/index.js"

describe("assertDeviceMatches", () => {
    it("accepte quand deviceId enveloppe == topic", () => {
        const r = assertDeviceMatches(telemetryTopic("truck-042"), { deviceId: "truck-042" })
        expect(Either.isRight(r)).toBe(true)
    })

    it("rejette l'usurpation (mismatch)", () => {
        const r = assertDeviceMatches(telemetryTopic("truck-042"), { deviceId: "truck-999" })
        expect(Either.isLeft(r)).toBe(true)
        // oxlint-disable-next-line vitest/no-conditional-expect
        if (Either.isLeft(r)) expect(r.left._tag).toBe("TopicMismatchError")
    })

    it("rejette un topic inconnu", () => {
        const r = assertDeviceMatches("fleet/v1/truck-042/n-importe-quoi", { deviceId: "truck-042" })
        expect(Either.isLeft(r)).toBe(true)
        // oxlint-disable-next-line vitest/no-conditional-expect
        if (Either.isLeft(r)) expect(r.left._tag).toBe("UnknownTopicError")
    })
})