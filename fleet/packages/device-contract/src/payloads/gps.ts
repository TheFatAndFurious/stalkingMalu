import { Schema } from 'effect';

export const GpsPayload = Schema.Struct({
  latitude: Schema.Number,
  longitude: Schema.Number,
});

export type GpsPayload = typeof GpsPayload.Type;
