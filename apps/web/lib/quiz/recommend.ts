/**
 * Quiz → product recommendation engine.
 *
 * Pure function — given the user's answers and the active catalogue, returns
 * a short list of products with the reason each was chosen. Side-effect free,
 * trivially testable, and easy to evolve as the catalogue grows.
 *
 * Compliance: every `reason` string here describes feel or appearance, never
 * a medical claim. The same register as the catalogue copy itself.
 */

import type { QuizAnswers, QuizProduct, QuizRecommendation } from './types';

/** Names of the two top-level categories the storefront expects. Single source. */
const HAIR_CATEGORY = 'Hair care';
const SKIN_CATEGORY = 'Skin care';

/** Maximum products returned in a single recommendation set. */
const MAX_RECOMMENDATIONS = 4;

/** Sort featured products first, then by the admin-defined order, then name. */
function rank(a: QuizProduct, b: QuizProduct): number {
  if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.name.localeCompare(b.name);
}

/**
 * Compose the human-readable reason from the user's answers. Kept generic so
 * a single product can match a range of concerns without sounding boilerplate.
 */
function reasonFor(answers: QuizAnswers, category: typeof HAIR_CATEGORY | typeof SKIN_CATEGORY): string {
  if (category === HAIR_CATEGORY) {
    if (answers.hairConcern === 'flakes') {
      return 'A gentle, herbal cleanse that suits people whose scalp tends to flake.';
    }
    if (answers.hairConcern === 'thinning') {
      return 'A nourishing routine pick — a classic in many people’s thicker-hair rituals.';
    }
    if (answers.hairConcern === 'dullness') {
      return 'Adds natural shine with regular use — no synthetic gloss.';
    }
    if (answers.hairConcern === 'breakage') {
      return 'Cleanses without sulphates, which can otherwise leave strands more brittle.';
    }
    if (answers.hairType === 'oily-roots' || answers.hairType === 'oily') {
      return 'A light herbal wash that suits oilier scalps.';
    }
    if (answers.hairType === 'dry') {
      return 'A gentle, herbal cleanse — kind to drier hair than a sulphate-heavy shampoo.';
    }
    return 'A clean, herbal starting point for everyday hair care.';
  }

  // Skin care branch
  if (answers.skinConcern === 'blemishes') {
    return 'A traditional Ayurvedic option for blemish-prone skin routines.';
  }
  if (answers.skinConcern === 'uneven-tone') {
    return 'Often included in routines aimed at a more even-feeling skin tone.';
  }
  if (answers.skinConcern === 'dullness') {
    return 'For brighter, fresher-feeling skin with regular use.';
  }
  if (answers.skinConcern === 'texture') {
    return 'Gentle on the skin barrier — a steady part of many people’s long-term routines.';
  }
  if (answers.skinType === 'sensitive') {
    return 'No synthetic colours or harsh additives — suits more reactive skin.';
  }
  return 'A clean, herbal starting point for everyday skin care.';
}

/**
 * Run the recommender. Returns at most `MAX_RECOMMENDATIONS` products, in
 * priority order. An empty array means the matching category has no active
 * products yet — the UI surfaces a friendly fallback in that case.
 */
export function recommend(answers: QuizAnswers, products: QuizProduct[]): QuizRecommendation[] {
  const wantsHair = answers.primaryFocus === 'hair' || answers.primaryFocus === 'both';
  const wantsSkin = answers.primaryFocus === 'skin' || answers.primaryFocus === 'both';

  const hair = wantsHair
    ? products.filter((p) => p.categoryName === HAIR_CATEGORY).sort(rank)
    : [];
  const skin = wantsSkin
    ? products.filter((p) => p.categoryName === SKIN_CATEGORY).sort(rank)
    : [];

  // For "both", interleave hair and skin so neither category dominates the list.
  let ordered: QuizProduct[];
  if (wantsHair && wantsSkin) {
    ordered = [];
    const max = Math.max(hair.length, skin.length);
    for (let i = 0; i < max; i++) {
      if (hair[i]) ordered.push(hair[i]);
      if (skin[i]) ordered.push(skin[i]);
    }
  } else if (wantsHair) {
    ordered = hair;
  } else {
    ordered = skin;
  }

  return ordered.slice(0, MAX_RECOMMENDATIONS).map((product) => ({
    product,
    reason: reasonFor(
      answers,
      product.categoryName === HAIR_CATEGORY ? HAIR_CATEGORY : SKIN_CATEGORY,
    ),
  }));
}
