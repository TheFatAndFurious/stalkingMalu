import { Data, Either } from "effect"
import { parseTopic, type ParsedTopic } from "./topics.js"

export class TopicMismatchError extends Data.TaggedError("TopicMismatchError")<{
    readonly topic: string
    readonly topicDeviceId: string
    readonly envelopeDeviceId: string
}> {}

export class UnknownTopicError extends Data.TaggedError("UnknownTopicError")<{
    readonly topic: string
}> {}

export type InvariantError = TopicMismatchError | UnknownTopicError

/**
 * Le deviceId de l'enveloppe doit correspondre à celui du topic.
 * Le topic fait autorité (garanti par l'ACL du broker) ; l'enveloppe est déclarative.
 * Renvoie le topic parsé — l'appelant en a besoin (live vs backfill).
 */
export const assertDeviceMatches = (
    topic: string,
    message: { readonly deviceId: string },
): Either.Either<ParsedTopic, InvariantError> =>
    parseTopic(topic).pipe(
        Either.fromOption(() => new UnknownTopicError({ topic })),
        Either.flatMap((parsed) =>
            parsed.deviceId === message.deviceId
                ? Either.right(parsed)
                : Either.left(
                    new TopicMismatchError({
                        topic,
                        topicDeviceId: parsed.deviceId,
                        envelopeDeviceId: message.deviceId,
                    }),
                ),
        ),
    )