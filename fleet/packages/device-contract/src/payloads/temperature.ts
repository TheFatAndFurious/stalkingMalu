import { Schema } from "effect"

export const TemperaturePayload = Schema.Struct({
    temperature: Schema.Number,
})

export type TemperaturePayload = typeof TemperaturePayload.Type;