// oxlint-disable vitest/no-conditional-expect
import {Either} from 'effect';
import {describe} from 'vitest';

import {decodeTelemetry, encodeTelemetry} from '../codecs.js';

const validGpsPayload = {
  messageId: '01902d5e-8f3a-7b1c-9d2e-3f4a5b6c7d8e',
  deviceId: 'truck-042',
  deviceTime: 1720900000000,
  messageType: 'gps',
  schemaVersion: 1,
  payload: {
    latitude: 48.856614,
    longitude: 2.352222,
  },
};

describe('telemetry message codecs', () => {
  it('il encode un message de type gps', () => {
    const message = Either.getOrThrow(decodeTelemetry(JSON.stringify(validGpsPayload)));
    const wire = Either.getOrThrow(encodeTelemetry(message));
    expect(JSON.parse(wire)).toEqual(validGpsPayload);
  });

  it('rejette un type gps portant un payload température', () => {
    const bad = { ...validGpsPayload, payload: { celsius: 4.2, sensorId: 'probe-a' } };
    expect(Either.isLeft(decodeTelemetry(JSON.stringify(bad)))).toBe(true);
  });

  it('rejette un payload gps malformé avec une erreur de stage schema', () => {
    const bad = {
      ...validGpsPayload,
      payload: { ...validGpsPayload.payload, latitude: 'pas-un-nombre' },
    };
    const res = decodeTelemetry(JSON.stringify(bad));
    console.log("isLeft:", Either.isLeft(res))
    if (Either.isRight(res)) console.log("décodé:", res.right.payload)
    expect(Either.isLeft(res)).toBe(true);
    if (Either.isLeft(res)) expect(res.left.stage).toBe('schema');
  });

  it('rejette un JSON illisible avec une erreur de stage json', () => {
    const res = decodeTelemetry('{ pas du json');
    expect(Either.isLeft(res)).toBe(true);
    if (Either.isLeft(res)) expect(res.left.stage).toBe('json');
  });

  it('ignore les champs inconnus (compat ascendante)', () => {
    const withExtra = { ...validGpsPayload, champFutur: 'peu importe' };
    expect(Either.isRight(decodeTelemetry(JSON.stringify(withExtra)))).toBe(true);
  });

  it('rejette actuellement un messageType inconnu (cf. note compat)', () => {
    const unknown = { ...validGpsPayload, messageType: 'humidity', payload: { percent: 60 } };
    // Avec l'union discriminée, un type inconnu échoue → DLQ.
    // Contredit la promesse 'ignorer les types inconnus' du README — décision à trancher.
    expect(Either.isLeft(decodeTelemetry(JSON.stringify(unknown)))).toBe(true);
  });
});
