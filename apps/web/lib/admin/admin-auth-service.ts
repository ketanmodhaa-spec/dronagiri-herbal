/**
 * Admin authentication — the service layer.
 *
 * Every admin-auth operation that touches the database lives here; route
 * handlers call these functions and never reach for Prisma directly
 * (CLAUDE.md). Node runtime only — it uses bcrypt and the Node crypto module.
 */
import { createHash, randomBytes } from 'node:crypto';

import { prisma, type AdminUser } from '@dronagiri/db';
import bcrypt from 'bcryptjs';
import type { NextRequest } from 'next/server';

import {
  ADMIN_REFRESH_TTL_SECONDS,
  signAdminAccessToken,
  type AdminClaims,
} from '@/lib/auth/admin-session';
import { AuthError } from '@/lib/errors';

/** bcrypt cost factor — matches the catalogue seed and the ensure-admin script. */
const BCRYPT_ROUNDS = 12;

/**
 * A bcrypt hash compared against when the email is unknown, so a login attempt
 * does the same work — and takes the same time — whether or not the account
 * exists. Built once, lazily, then cached.
 */
let dummyHash: string | undefined;
function getDummyHash(): string {
  dummyHash ??= bcrypt.hashSync('no-such-account', BCRYPT_ROUNDS);
  return dummyHash;
}

/** SHA-256 hex digest — refresh tokens are stored hashed, never in the clear. */
function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** A fresh, opaque refresh token — 48 random bytes, URL-safe. */
function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

/** Reduce a full admin row to the claims that may safely leave the server. */
export function toSafeAdmin(admin: AdminUser | AdminClaims): AdminClaims {
  return { id: admin.id, email: admin.email, name: admin.name, role: admin.role };
}

/** Where the request came from — recorded against each refresh token. */
export interface SessionContext {
  ipAddress: string | null;
  userAgent: string | null;
}

/** Derive the session context from an incoming request. */
export function sessionContextFromRequest(req: NextRequest): SessionContext {
  const forwarded = req.headers.get('x-forwarded-for');
  return {
    ipAddress: forwarded ? forwarded.split(',')[0].trim() : null,
    userAgent: req.headers.get('user-agent'),
  };
}

/** A freshly issued session — the raw refresh token is set as a cookie, never stored. */
export interface IssuedSession {
  admin: AdminClaims;
  accessToken: string;
  refreshToken: string;
}

/** The expiry instant for a refresh token created now. */
function refreshExpiry(): Date {
  return new Date(Date.now() + ADMIN_REFRESH_TTL_SECONDS * 1000);
}

/**
 * Verify an email + password pair.
 *
 * The same error — and the same amount of work — is returned whether the email
 * is unknown, the account is disabled, or the password is wrong: a bcrypt
 * comparison runs in every case, so response timing cannot enumerate accounts.
 */
export async function authenticateAdmin(email: string, password: string): Promise<AdminUser> {
  const admin = await prisma.adminUser.findUnique({ where: { email } });

  if (!admin || !admin.isActive) {
    await bcrypt.compare(password, getDummyHash());
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) {
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
  }
  return admin;
}

/** Start a session after a successful login — records the refresh token and the login time. */
export async function startAdminSession(
  admin: AdminUser,
  context: SessionContext,
): Promise<IssuedSession> {
  const refreshToken = generateRefreshToken();

  await prisma.$transaction([
    prisma.adminRefreshToken.create({
      data: {
        adminUserId: admin.id,
        tokenHash: sha256(refreshToken),
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
        expiresAt: refreshExpiry(),
      },
    }),
    prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    }),
  ]);

  const claims = toSafeAdmin(admin);
  return { admin: claims, accessToken: await signAdminAccessToken(claims), refreshToken };
}

/**
 * Exchange a refresh token for a fresh pair, rotating the refresh token.
 *
 * Theft detection: a refresh token that has already been revoked — it was
 * rotated out, yet someone still holds it — is treated as stolen. Every refresh
 * token for that admin is then revoked, forcing a clean re-login everywhere.
 */
export async function refreshAdminSession(
  rawRefreshToken: string,
  context: SessionContext,
): Promise<IssuedSession> {
  const existing = await prisma.adminRefreshToken.findUnique({
    where: { tokenHash: sha256(rawRefreshToken) },
  });

  if (!existing) {
    throw new AuthError(
      'Your session is no longer valid. Please sign in again.',
      'SESSION_INVALID',
    );
  }

  if (existing.revokedAt) {
    // A revoked token being presented = reuse = theft. Burn the whole family.
    await revokeAllAdminSessions(existing.adminUserId);
    throw new AuthError(
      'Your session was ended for security. Please sign in again.',
      'SESSION_REVOKED',
    );
  }

  if (existing.expiresAt.getTime() <= Date.now()) {
    throw new AuthError('Your session has expired. Please sign in again.', 'SESSION_EXPIRED');
  }

  const admin = await prisma.adminUser.findUnique({ where: { id: existing.adminUserId } });
  if (!admin || !admin.isActive) {
    await revokeAllAdminSessions(existing.adminUserId);
    throw new AuthError('Your account is no longer active.', 'ACCOUNT_INACTIVE');
  }

  // Rotate: revoke the presented token and issue a fresh one — atomically.
  const refreshToken = generateRefreshToken();
  await prisma.$transaction([
    prisma.adminRefreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    }),
    prisma.adminRefreshToken.create({
      data: {
        adminUserId: admin.id,
        tokenHash: sha256(refreshToken),
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
        expiresAt: refreshExpiry(),
      },
    }),
  ]);

  const claims = toSafeAdmin(admin);
  return { admin: claims, accessToken: await signAdminAccessToken(claims), refreshToken };
}

/** Revoke every active refresh token for an admin — used by logout and after a password change. */
export async function revokeAllAdminSessions(adminUserId: string): Promise<void> {
  await prisma.adminRefreshToken.updateMany({
    where: { adminUserId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Change an admin's password. The current password is required even though the
 * caller is authenticated — it stops a hijacked session from taking over the
 * account. On success every existing session is revoked.
 */
export async function changeAdminPassword(
  adminUserId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminUserId } });
  if (!admin || !admin.isActive) {
    throw new AuthError('Your account is no longer active.', 'ACCOUNT_INACTIVE');
  }

  const ok = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!ok) {
    throw new AuthError('Your current password is incorrect.', 'INVALID_PASSWORD');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.adminUser.update({ where: { id: adminUserId }, data: { passwordHash } });
  await revokeAllAdminSessions(adminUserId);
}
