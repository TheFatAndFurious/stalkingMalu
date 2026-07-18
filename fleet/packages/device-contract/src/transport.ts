import { TopicKind } from './topics.js';

/** MQTT QoS: Quality of Service has 3 levels
 *  QoS 0 (At most once): A "fire and forget" method with no delivery guarantee; best for stable connections and non-critical data.
 *  QoS 1 (At least once): Guarantees message delivery but may result in duplicates;
 *  the most common choice for general IoT reliability.
 *   QoS 2 (Exactly once): The highest reliability level, ensuring a message is delivered exactly one time via a four-step handshake.
 *  */
export type Qos = 0 | 1 | 2;

export interface TopicPolicy {
  readonly qos: Qos;
  readonly retain: boolean;
}

export const TOPIC_POLICY = {
  telemetry: { qos: 1, retain: false },
  'telemetry-backfill': { qos: 1, retain: false },
  status: { qos: 1, retain: true },
  config: { qos: 1, retain: true },
} as const satisfies Record<TopicKind, TopicPolicy>;

export const policyFor = (kind: TopicKind): TopicPolicy => TOPIC_POLICY[kind];
