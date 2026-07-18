import { describe, expect, it } from "vitest"
import { policyFor } from "../src/index.js"

describe("politique de transport", () => {
    it("status et config sont retained", () => {
        expect(policyFor("status").retain).toBe(true)
        expect(policyFor("config").retain).toBe(true)
    })
    it("la télémétrie n'est pas retained", () => {
        expect(policyFor("telemetry").retain).toBe(false)
        expect(policyFor("telemetry-backfill").retain).toBe(false)
    })
    it("tout est au moins QoS 1", () => {
        for (const k of ["telemetry", "status", "config"] as const) {
            expect(policyFor(k).qos).toBeGreaterThanOrEqual(1)
        }
    })
})