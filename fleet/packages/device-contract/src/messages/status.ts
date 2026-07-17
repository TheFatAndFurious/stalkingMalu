import { Schema } from "effect"

export const StatusMessage = Schema.Struct({
    status: Schema.Literal("online", "offline"),
    reason: Schema.optionalWith(Schema.NonEmptyString, { nullable: true})
})

export type StatusMessage = typeof StatusMessage.Type