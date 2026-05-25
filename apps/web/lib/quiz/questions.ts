/**
 * Quiz question definitions.
 *
 * Keep wording compliant: cosmetics in India cannot promise medical outcomes,
 * so option labels describe *appearance* and *feel*, never diagnosis. The
 * recommendation reasons in `recommend.ts` use the same register.
 */

import type {
  HairConcern,
  HairType,
  PrimaryFocus,
  RoutineCommitment,
  SkinConcern,
  SkinType,
} from './types';

export interface QuestionOption<V extends string> {
  value: V;
  label: string;
}

export type QuestionId =
  | 'primaryFocus'
  | 'hairType'
  | 'hairConcern'
  | 'skinType'
  | 'skinConcern'
  | 'routine';

export interface Question<V extends string = string> {
  id: QuestionId;
  prompt: string;
  options: ReadonlyArray<QuestionOption<V>>;
}

export const primaryFocusQuestion: Question<PrimaryFocus> = {
  id: 'primaryFocus',
  prompt: 'What would you like to take care of?',
  options: [
    { value: 'hair', label: 'Hair' },
    { value: 'skin', label: 'Skin' },
    { value: 'both', label: 'Both' },
  ],
};

export const hairTypeQuestion: Question<HairType> = {
  id: 'hairType',
  prompt: 'How does your scalp usually feel?',
  options: [
    { value: 'oily-roots', label: 'Oily roots, drier ends' },
    { value: 'oily', label: 'Generally oily' },
    { value: 'dry', label: 'Generally dry' },
    { value: 'balanced', label: 'Balanced' },
  ],
};

export const hairConcernQuestion: Question<HairConcern> = {
  id: 'hairConcern',
  prompt: 'What is on your mind about your hair right now?',
  options: [
    { value: 'flakes', label: 'Flakes or an itchy scalp' },
    { value: 'thinning', label: 'Hair looks thinner or lacks volume' },
    { value: 'dullness', label: 'Looks dull or lifeless' },
    { value: 'breakage', label: 'Breakage or split ends' },
    { value: 'none', label: 'Nothing specific — just want a gentle routine' },
  ],
};

export const skinTypeQuestion: Question<SkinType> = {
  id: 'skinType',
  prompt: 'How does your skin usually behave?',
  options: [
    { value: 'oily', label: 'Oily through the day' },
    { value: 'dry', label: 'Dry — feels tight' },
    { value: 'combination', label: 'Combination — oily T-zone, drier cheeks' },
    { value: 'sensitive', label: 'Sensitive — reacts easily' },
    { value: 'balanced', label: 'Balanced' },
  ],
};

export const skinConcernQuestion: Question<SkinConcern> = {
  id: 'skinConcern',
  prompt: 'What would you most like to improve?',
  options: [
    { value: 'blemishes', label: 'Blemish-prone areas' },
    { value: 'uneven-tone', label: 'Uneven tone or dark spots' },
    { value: 'dullness', label: 'Dullness' },
    { value: 'texture', label: 'Texture or fine lines' },
    { value: 'none', label: 'Nothing specific — just want a gentle routine' },
  ],
};

export const routineQuestion: Question<RoutineCommitment> = {
  id: 'routine',
  prompt: 'How often do you make time for your routine?',
  options: [
    { value: 'daily', label: 'Daily — it is a habit' },
    { value: 'few-times-week', label: 'A few times a week' },
    { value: 'when-i-remember', label: 'When I remember' },
  ],
};
