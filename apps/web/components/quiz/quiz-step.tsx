import type { Question } from '@/lib/quiz/questions';

interface QuizStepProps<V extends string> {
  /** The question being shown. */
  question: Question<V>;
  /** 1-based position for the progress text. */
  stepNumber: number;
  /** Total steps in the current branch — recomputed when a branch changes. */
  totalSteps: number;
  /** The currently chosen value, if any. Lets the user see their previous pick. */
  selected: V | undefined;
  /** Fired when the user selects an option — records the answer and advances. */
  onSelect: (value: V) => void;
  /** Fired when the user clicks Back. Hidden on the first step. */
  onBack: (() => void) | null;
}

/**
 * A single step in the quiz. Pure presentational — all flow logic lives in
 * `QuizFlow`. Select-to-advance: clicking an option both records and moves on.
 */
export function QuizStep<V extends string>({
  question,
  stepNumber,
  totalSteps,
  selected,
  onSelect,
  onBack,
}: QuizStepProps<V>) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
        Question {stepNumber} of {totalSteps}
      </p>
      <h2 className="mt-3 font-display text-2xl font-semibold text-forest-900 sm:text-3xl">
        {question.prompt}
      </h2>

      <div className="mt-8 grid gap-3">
        {question.options.map((option) => {
          const isSelected = option.value === selected;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={[
                'w-full rounded-2xl border px-5 py-4 text-left text-base transition',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600',
                isSelected
                  ? 'border-forest-600 bg-forest-50 text-forest-900 ring-1 ring-forest-600'
                  : 'border-forest-100 bg-white text-stone hover:border-forest-300 hover:bg-forest-50/50',
              ].join(' ')}
              aria-pressed={isSelected}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-forest-700 hover:text-forest-800"
          >
            ← Back
          </button>
        ) : (
          <span aria-hidden />
        )}
        <p className="text-xs text-stone-light">Your answers stay on this device.</p>
      </div>
    </div>
  );
}
