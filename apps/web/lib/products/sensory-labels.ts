/**
 * Customer-facing wording for the product sensory profile — one place, shared
 * by the admin form and the product page, so both always use the same words.
 */
import type {
  ProductAroma,
  ProductFinish,
  ProductRoutine,
  ProductTexture,
} from '@dronagiri/validators';

export const TEXTURE_LABELS: Record<ProductTexture, string> = {
  LIGHTWEIGHT_GEL: 'Lightweight gel',
  RICH_BODY_BUTTER: 'Rich body butter',
  NOURISHING_OIL: 'Nourishing oil',
  NON_GREASY_LOTION: 'Non-greasy lotion',
  REFRESHING_MIST: 'Refreshing mist',
  FOAMING_SHAMPOO: 'Gentle foaming shampoo',
  POWDER_PACK: 'Powder pack — mixed into a paste',
  EXFOLIATING_SCRUB: 'Exfoliating scrub',
};

export const AROMA_LABELS: Record<ProductAroma, string> = {
  HERBAL: 'Herbal',
  EARTHY: 'Earthy',
  FLORAL: 'Floral',
  CITRUS: 'Citrus',
  CAMPHOR: 'Camphor',
  WARM: 'Warm',
  MILD_NATURAL: 'Mild & natural',
};

/** Shown beside the aroma checkboxes in admin, so the choice is consistent. */
export const AROMA_HINTS: Partial<Record<ProductAroma, string>> = {
  WARM: 'coffee, turmeric, spices',
  MILD_NATURAL: 'no added fragrance',
};

export const FINISH_LABELS: Record<ProductFinish, string> = {
  SKIN_MATTE: 'Matte',
  SKIN_DEWY: 'Dewy',
  SKIN_NOURISHING: 'Deeply nourished',
  SKIN_FRESH: 'Fresh & clean',
  HAIR_SOFT_SMOOTH: 'Soft & smooth',
  HAIR_VOLUMINOUS: 'Light & voluminous',
  HAIR_CONDITIONED: 'Deeply conditioned',
  HAIR_CLEAN_FRESH: 'Clean & fresh',
};

export const ROUTINE_LABELS: Record<ProductRoutine, string> = {
  LEAVE_ON: 'Leave-on',
  RINSE_OFF: 'Rinse-off',
};

/** One "How it feels" row on the product page. */
export interface SensoryRow {
  label: string;
  value: string;
}

/**
 * The rows to show for a product, in a fixed order. Fields that aren't set
 * are skipped, so a product with nothing filled in shows no section at all.
 */
export function sensoryRows(product: {
  texture: ProductTexture | null;
  aromas: ProductAroma[];
  finish: ProductFinish | null;
  routine: ProductRoutine | null;
  routineNote: string | null;
}): SensoryRow[] {
  const rows: SensoryRow[] = [];
  if (product.texture) rows.push({ label: 'Texture', value: TEXTURE_LABELS[product.texture] });
  if (product.aromas.length > 0) {
    rows.push({ label: 'Aroma', value: product.aromas.map((aroma) => AROMA_LABELS[aroma]).join(', ') });
  }
  if (product.finish) {
    const on = product.finish.startsWith('HAIR_') ? 'Hair feels' : 'Skin feels';
    rows.push({ label: on, value: FINISH_LABELS[product.finish] });
  }
  if (product.routine) {
    const routine = ROUTINE_LABELS[product.routine];
    rows.push({ label: 'Routine', value: product.routineNote ? `${routine} · ${product.routineNote}` : routine });
  }
  return rows;
}
