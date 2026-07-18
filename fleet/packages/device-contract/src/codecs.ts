import { Data, Either, Schema } from 'effect';
import type { ParseResult } from 'effect';

import { DeviceConfig } from './messages/device-config.js';
import { StatusMessage } from './messages/status.js';
import { TelemetryMessage } from './messages/telemetry.js';

/** Échec typé. Le bridge branche sur le Left : malformé → dead-letter. */
export class MessageDecodeError extends Data.TaggedError('MessageDecodeError')<{
  readonly stage: 'json' | 'schema';
  readonly raw: string;
  readonly cause: unknown; // SyntaxError (json) | ParseResult.ParseError (schema)
}> {}

/** Décodeur générique wire(JSON string) → domaine, pour n'importe quel schéma. */
const decodeJson = <A, I>(schema: Schema.Schema<A, I>) => {
  const decode = Schema.decodeUnknownEither(schema); // compilé une fois par type
  return (raw: string): Either.Either<A, MessageDecodeError> =>
    Either.try({
      try: () => JSON.parse(raw) as unknown,
      catch: (cause) => new MessageDecodeError({ stage: 'json', raw, cause }),
    }).pipe(
      Either.flatMap((json) =>
        decode(json).pipe(
          Either.mapLeft((cause) => new MessageDecodeError({ stage: 'schema', raw, cause })),
        ),
      ),
    );
};

/** Encodeur générique domaine → wire(JSON string). */
const encodeJson = <A, I>(schema: Schema.Schema<A, I>) => {
  const encode = Schema.encodeEither(schema);
  return (value: A): Either.Either<string, ParseResult.ParseError> =>
    encode(value).pipe(Either.map(JSON.stringify));
};

// ── Codecs publics ───────────────────────────────────────────
export const decodeTelemetry = decodeJson(TelemetryMessage);
export const encodeTelemetry = encodeJson(TelemetryMessage);
export const decodeStatus = decodeJson(StatusMessage);
export const encodeStatus = encodeJson(StatusMessage);
export const decodeConfig = decodeJson(DeviceConfig);
export const encodeConfig = encodeJson(DeviceConfig);
