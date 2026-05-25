/**
 * Types shared by the quiz UI, the recommendation engine, and the page that
 * stitches them together. The questions themselves live in `questions.ts`;
 * this file is the *shape*, not the content.
 */

/** Top-level category the user wants to take care of. Drives which branch runs. */
export type PrimaryFocus = 'hair' | 'skin' | 'both';

export type HairType = 'oily-roots' | 'oily' | 'dry' | 'balanced';
export type HairConcern =
  | 'flakes'
  | 'thinning'
  | 'dullness'
  | 'breakage'
  | 'none';

export type SkinType = 'oily' | 'dry' | 'combination' | 'sensitive' | 'balanced';
export type SkinConcern =
  | 'blemishes'
  | 'uneven-tone'
  | 'dullness'
  | 'texture'
  | 'none';

export type RoutineCommitment = 'daily' | 'few-times-week' | 'when-i-remember';

/**
 * The full set of answers a completed quiz produces. Branches are optional —
 * a user who picks "Skin" never sees the hair questions, so `hairType` and
 * `hairConcern` stay undefined.
 */
export interface QuizAnswers {
  primaryFocus: PrimaryFocus;
  hairType?: HairType;
  hairConcern?: HairConcern;
  skinType?: SkinType;
  skinConcern?: SkinConcern;
  routine: RoutineCommitment;
}

/**
 * The shape the recommender needs from a Product. Carries only the fields we
 * read — the page composes this from full Product rows at request time.
 */
export interface QuizProduct {
  slug: string;
  name: string;
  tagline: string | null;
  pricePaise: number;
  comparePaise: number | null;
  sizeLabel: string | null;
  categoryName: string;
  isFeatured: boolean;
  sortOrder: number;
}

/** A single product the quiz recommends, plus the human reason it was picked. */
export interface QuizRecommendation {
  product: QuizProduct;
  reason: string;
}
