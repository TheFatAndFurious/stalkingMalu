import {Schema} from "effect";

export const DeviceConfig = Schema.Struct({
    samplingRateHz: Schema.Number,
})

export type DeviceConfig = typeof DeviceConfig.Type