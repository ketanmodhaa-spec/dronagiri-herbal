import { Prisma, PrismaClient } from '@prisma/client';

/*
 * Neon scale-to-zero: an idle compute is suspended, and the first connection
 * after idle has to wake it. Two layers keep that wake-up invisible to
 * visitors:
 *
 *  1. A 15 s connect timeout (Prisma's default is 5 s), as Neon recommends
 *     for Prisma — enough for a compute to start. Added here, in code, so no
 *     connection string has to be edited by hand.
 *  2. A retry for operations that failed because the server could not be
 *     reached at all. Those codes mean the query never ran, so retrying is
 *     safe even for writes. Any other error — including a connection dropped
 *     mid-query — is thrown straight away and never retried, so nothing can
 *     be applied twice.
 *
 * A `$transaction` call is not itself an operation the retry sees; its first
 * connection relies on layer 1.
 */

/** P1001: can't reach database server. P1002: reached, but timed out connecting. */
const UNREACHABLE_CODES = new Set(['P1001', 'P1002']);

/** Waits before each retry; two retries in total. */
const RETRY_DELAYS_MS = [500, 1500] as const;

const CONNECT_TIMEOUT_SECONDS = '15';

function isUnreachable(error: unknown): boolean {
  // The engine failed to open its first connection, so no query ran. Prisma
  // often leaves errorCode unset here (seen on the very first query of a
  // fresh process), so the class alone decides.
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return UNREACHABLE_CODES.has(error.code);
  }
  return false;
}

/** The connection URL with a cold-start-friendly connect timeout, unless one is already set. */
function withConnectTimeout(url: string | undefined): string | undefined {
  if (!url) return url;
  const parsed = new URL(url);
  if (!parsed.searchParams.has('connect_timeout')) {
    parsed.searchParams.set('connect_timeout', CONNECT_TIMEOUT_SECONDS);
  }
  return parsed.toString();
}

function createClient() {
  return new PrismaClient({ datasourceUrl: withConnectTimeout(process.env.DATABASE_URL) }).$extends({
    name: 'retry-when-unreachable',
    query: {
      async $allOperations({ args, query }) {
        for (let attempt = 0; ; attempt++) {
          try {
            return await query(args);
          } catch (error) {
            if (!isUnreachable(error) || attempt >= RETRY_DELAYS_MS.length) {
              throw error;
            }
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
          }
        }
      },
    },
  });
}

export type DbClient = ReturnType<typeof createClient>;

const globalForPrisma = globalThis as unknown as { prisma?: DbClient };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export * from '@prisma/client';
