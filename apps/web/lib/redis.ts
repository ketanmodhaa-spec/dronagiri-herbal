/**
 * Shared Upstash Redis client.
 *
 * Created lazily and cached for the life of the server instance — the same
 * connection backs rate limiters, the OTP store, the (future) Redis-backed
 * cart, and any other ephemeral state we keep outside Postgres. Code that
 * needs Redis imports `getRedis()` from here, not `@upstash/redis` directly,
 * so the URL/token boundary lives in exactly one place.
 */

import { Redis } from '@upstash/redis';

import { serverConfig } from '@/lib/config.server';

let client: Redis | undefined;

export function getRedis(): Redis {
  client ??= new Redis({ url: serverConfig.redis.url, token: serverConfig.redis.token });
  return client;
}
