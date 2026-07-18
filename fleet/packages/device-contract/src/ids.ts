import { Schema } from 'effect';

export const MessageId = Schema.UUID.pipe(Schema.brand('MessageId'));
export type MessageId = typeof MessageId.Type;

export const DeviceId = Schema.String.pipe(Schema.brand('DeviceId'));
export type DeviceId = typeof DeviceId.Type;
export const EpochMs = Schema.Number.pipe(Schema.brand('EpochMs'));
export type EpochMs = typeof EpochMs.Type;
