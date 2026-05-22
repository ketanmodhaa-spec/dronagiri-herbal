/**
 * Dronagiri Herbal — ensure the owner admin account exists.
 * ---------------------------------------------------------------------------
 * Idempotent and SAFE FOR PRODUCTION. Unlike the catalogue seed, this script
 * touches only the AdminUser table and never deletes anything.
 *
 *   • Account absent  → created, with a bcrypt hash of ADMIN_SEED_PASSWORD.
 *   • Account present → only `role` and `isActive` are reconciled. The
 *     password hash is never read and never written, so a password the owner
 *     has already changed through the admin panel survives every re-run.
 *
 * Run with:
 *   doppler run -- pnpm --filter @dronagiri/db db:ensure-admin
 */
import { AdminRole, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** bcrypt cost factor — matches the catalogue seed and the web app. */
const BCRYPT_ROUNDS = 12;
/** Display name for the owner account. */
const OWNER_NAME = 'Sarita Modha';

async function main() {
  const email = process.env.ADMIN_DEFAULT_EMAIL?.trim().toLowerCase();
  if (!email) {
    throw new Error(
      'ADMIN_DEFAULT_EMAIL is not set. Add it to Doppler and run this via `doppler run`.',
    );
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });

  if (existing) {
    // Reconcile role + active flag ONLY. passwordHash is deliberately never
    // touched — the owner may already have set her own password.
    if (existing.role !== AdminRole.OWNER || !existing.isActive) {
      await prisma.adminUser.update({
        where: { id: existing.id },
        data: { role: AdminRole.OWNER, isActive: true },
      });
      console.log(
        `Admin "${email}" already existed — reconciled role=OWNER, isActive=true. Password untouched.`,
      );
    } else {
      console.log(`Admin "${email}" already exists and is correct. Nothing changed.`);
    }
    return;
  }

  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!password || password.trim().length === 0) {
    throw new Error(
      'ADMIN_SEED_PASSWORD is not set — it is required to create the admin account.',
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await prisma.adminUser.create({
    data: { email, name: OWNER_NAME, role: AdminRole.OWNER, passwordHash },
  });
  console.log(`Created admin "${email}" (role=OWNER). Password set from ADMIN_SEED_PASSWORD.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('ensure-admin failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
