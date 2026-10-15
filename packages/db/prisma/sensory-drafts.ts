/**
 * Dronagiri Herbal — first-draft "How it feels" profiles for the catalogue.
 * ---------------------------------------------------------------------------
 * SAFE FOR PRODUCTION. Matches products by name and fills texture, aroma,
 * finish and routine from the printed pamphlet — but only on products where
 * none of those has been set yet. Anything Sarita has already chosen in the
 * admin panel is never touched, so re-running is harmless.
 *
 * These are drafts for Sarita to check, not facts: she corrects them in
 * Admin → Products → (product) → How it feels.
 *
 * Dry run (prints the plan, writes nothing):
 *   doppler run -- pnpm --filter @dronagiri/db db:sensory-drafts
 * Write:
 *   doppler run -- pnpm --filter @dronagiri/db db:sensory-drafts --apply
 */
import {
  PrismaClient,
  type ProductAroma,
  type ProductFinish,
  type ProductRoutine,
  type ProductTexture,
} from '@prisma/client';

const prisma = new PrismaClient();

interface Profile {
  texture: ProductTexture;
  aromas: ProductAroma[];
  finish: ProductFinish;
  routine: ProductRoutine;
  routineNote: string | null;
}

/** Hydra toner aroma, by the botanical in its name. */
function tonerAromas(name: string): ProductAroma[] {
  if (name.includes('rose') || name.includes('jasmin')) return ['FLORAL'];
  if (name.includes('lavender')) return ['FLORAL', 'HERBAL'];
  if (name.includes('lime')) return ['CITRUS'];
  if (name.includes('teatree')) return ['CAMPHOR', 'HERBAL'];
  return ['MILD_NATURAL'];
}

/**
 * Draft profile for a product, from its name squashed to lowercase letters
 * ("Aloevera Gel" and "Aloe Vera Gel" both become "aloeveragel"). The most
 * specific rules come first. Null when no rule recognises the product.
 */
function draftFor(name: string): Profile | null {
  if (name.includes('hydra') || name.includes('toner')) {
    return { texture: 'REFRESHING_MIST', aromas: tonerAromas(name), finish: 'SKIN_FRESH', routine: 'LEAVE_ON', routineNote: null };
  }
  if (name.includes('shampoo')) {
    const aromas: ProductAroma[] = name.includes('hibiscus')
      ? ['FLORAL', 'HERBAL']
      : name.includes('aloe')
        ? ['MILD_NATURAL']
        : ['HERBAL'];
    const finish: ProductFinish = name.includes('herbal') ? 'HAIR_CLEAN_FRESH' : 'HAIR_SOFT_SMOOTH';
    return { texture: 'FOAMING_SHAMPOO', aromas, finish, routine: 'RINSE_OFF', routineNote: null };
  }
  if (name.includes('hairgel')) {
    return { texture: 'LIGHTWEIGHT_GEL', aromas: ['MILD_NATURAL'], finish: 'HAIR_SOFT_SMOOTH', routine: 'LEAVE_ON', routineNote: null };
  }
  if (name.includes('aloeveragel')) {
    return { texture: 'LIGHTWEIGHT_GEL', aromas: ['MILD_NATURAL'], finish: 'SKIN_DEWY', routine: 'LEAVE_ON', routineNote: null };
  }
  if (name.includes('hairproteinpack')) {
    return { texture: 'POWDER_PACK', aromas: ['HERBAL', 'EARTHY'], finish: 'HAIR_SOFT_SMOOTH', routine: 'RINSE_OFF', routineNote: 'Paste rests 4–5 hrs · 45 min on hair' };
  }
  if (name.includes('blackherbal') || name.includes('blackhair')) {
    return { texture: 'POWDER_PACK', aromas: ['HERBAL', 'EARTHY'], finish: 'HAIR_SOFT_SMOOTH', routine: 'RINSE_OFF', routineNote: '2 hrs on hair · shampoo after 24 hrs' };
  }
  if (name.includes('skincarepack')) {
    return { texture: 'POWDER_PACK', aromas: ['HERBAL', 'EARTHY'], finish: 'SKIN_FRESH', routine: 'RINSE_OFF', routineNote: '15–20 min on skin' };
  }
  if (name.includes('orangepack')) {
    return { texture: 'POWDER_PACK', aromas: ['CITRUS', 'EARTHY'], finish: 'SKIN_FRESH', routine: 'RINSE_OFF', routineNote: '15–20 min, until it dries' };
  }
  if (name.includes('ubtan')) {
    return { texture: 'POWDER_PACK', aromas: ['WARM', 'EARTHY'], finish: 'SKIN_FRESH', routine: 'RINSE_OFF', routineNote: '20 min on skin' };
  }
  if (name.includes('multanimitti')) {
    return { texture: 'POWDER_PACK', aromas: ['EARTHY'], finish: 'SKIN_MATTE', routine: 'RINSE_OFF', routineNote: null };
  }
  if (name.includes('scrub')) {
    return { texture: 'EXFOLIATING_SCRUB', aromas: ['WARM'], finish: 'SKIN_FRESH', routine: 'RINSE_OFF', routineNote: '1–2 min massage · twice a week' };
  }
  if (name.includes('coconutoil')) {
    return { texture: 'NOURISHING_OIL', aromas: ['MILD_NATURAL'], finish: 'HAIR_CONDITIONED', routine: 'LEAVE_ON', routineNote: null };
  }
  if (name.includes('hairoil')) {
    return { texture: 'NOURISHING_OIL', aromas: ['HERBAL'], finish: 'HAIR_CONDITIONED', routine: 'RINSE_OFF', routineNote: 'Overnight or 7–8 hrs, then wash' };
  }
  if (name.includes('bodybutter')) {
    return { texture: 'RICH_BODY_BUTTER', aromas: ['WARM'], finish: 'SKIN_NOURISHING', routine: 'LEAVE_ON', routineNote: null };
  }
  return null;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, texture: true, aromas: true, finish: true, routine: true },
  });

  let planned = 0;
  for (const product of products) {
    const alreadySet =
      product.texture !== null || product.aromas.length > 0 || product.finish !== null || product.routine !== null;
    if (alreadySet) {
      console.log(`  skip   ${product.name} — already has a profile`);
      continue;
    }
    const draft = draftFor(product.name.toLowerCase().replace(/[^a-z]/g, ''));
    if (!draft) {
      console.log(`  ?      ${product.name} — no rule matches; fill in by hand`);
      continue;
    }
    planned += 1;
    console.log(
      `  ${apply ? 'write' : 'would'}  ${product.name} — ${draft.texture}, ${draft.aromas.join('+')}, ${draft.finish}, ${draft.routine}${draft.routineNote ? ` (${draft.routineNote})` : ''}`,
    );
    if (apply) await prisma.product.update({ where: { id: product.id }, data: draft });
  }

  console.log(
    apply ? `\nWrote ${planned} draft profile(s).` : `\nDry run: ${planned} product(s) would be filled. Re-run with --apply to write.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
