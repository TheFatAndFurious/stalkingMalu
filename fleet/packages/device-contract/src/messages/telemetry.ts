import {Schema} from 'effect';

import {DeviceId, EpochMs, MessageId} from '../ids.js';
import {GpsPayload} from '../payloads/gps.js';
import {TemperaturePayload} from '../payloads/temperature.js';

const base = {
  messageId: MessageId,
  deviceId: DeviceId,
  deviceTime: EpochMs,
  schemaVersion: Schema.Int,
};

export const TemperatureMessage = Schema.Struct({
  ...base,
  payload: TemperaturePayload,
  messageType: Schema.Literal('temperature'),
});

export type TemperatureMessage = typeof TemperatureMessage.Type;

export const GpsMessage = Schema.Struct({
  ...base,
  payload: GpsPayload,
  messageType: Schema.Literal('gps'),
});

export type GpsMessage = typeof GpsMessage.Type;

export const TelemetryMessage = Schema.Union(TemperatureMessage, GpsMessage);

export type TelemetryMessage = typeof TelemetryMessage.Type;
