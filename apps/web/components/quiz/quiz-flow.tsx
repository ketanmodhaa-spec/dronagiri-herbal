'use client';

import { useCallback, useMemo, useState } from 'react';

import { QuizResult } from '@/components/quiz/quiz-result';
import { QuizStep } from '@/components/quiz/quiz-step';
import {
  hairConcernQuestion,
  hairTypeQuestion,
  primaryFocusQuestion,
  routineQuestion,
  skinConcernQuestion,
  skinTypeQuestion,
  type Question,
  type QuestionId,
} from '@/lib/quiz/questions';
import { recommend } from '@/lib/quiz/recommend';
import type { QuizAnswers, QuizProduct } from '@/lib/quiz/types';

/** Lookup table — `QuestionId` → fully-typed Question. */
const QUESTIONS: Record<QuestionId, Question> = {
  primaryFocus: primaryFocusQuestion,
  hairType: hairTypeQuestion,
  hairConcern: hairConcernQuestion,
  skinType: skinTypeQuestion,
  skinConcern: skinConcernQuestion,
  routine: routineQuestion,
};

interface QuizFlowProps {
  /** Active products the quiz can recommend from. Server-fetched, fresh per render. */
  products: QuizProduct[];
}

/**
 * Compose the ordered list of questions for the current branch.
 *
 * The flow always opens with `primaryFocus`. Hair questions appear when the
 * user picks Hair or Both; skin questions appear for Skin or Both. The
 * routine question closes every branch.
 */
function stepListFor(answers: Partial<QuizAnswers>): QuestionId[] {
  const steps: QuestionId[] = ['primaryFocus'];
  if (!answers.primaryFocus) return steps;

  if (answers.primaryFocus === 'hair' || answers.primaryFocus === 'both') {
    steps.push('hairType', 'hairConcern');
  }
  if (answers.primaryFocus === 'skin' || answers.primaryFocus === 'both') {
    steps.push('skinType', 'skinConcern');
  }
  steps.push('routine');
  return steps;
}

/** Friendly label used in the empty-state fallback ("we are still adding ___ products"). */
function focusLabel(focus: QuizAnswers['primaryFocus'] | undefined): string {
  if (focus === 'skin') return 'skin care';
  if (focus === 'both') return 'hair and skin care';
  return 'hair care';
}

/**
 * The quiz state machine. All flow logic lives here; UI is split into
 * `QuizStep` and `QuizResult` for clarity.
 */
export function QuizFlow({ products }: QuizFlowProps) {
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const [index, setIndex] = useState(0);
  const [showingResults, setShowingResults] = useState(false);

  const steps = useMemo(() => stepListFor(answers), [answers]);
  const currentQuestionId = steps[index];
  const currentQuestion = currentQuestionId ? QUESTIONS[currentQuestionId] : null;

  const handleSelect = useCallback(
    (value: string) => {
      if (!currentQuestionId) return;
      const nextAnswers = { ...answers, [currentQuestionId]: value };
      setAnswers(nextAnswers);

      // The step list is derived from answers — picking "Skin" prunes the hair
      // branch out from underneath us. Recompute against the new answers.
      const nextSteps = stepListFor(nextAnswers);
      const nextIndex = index + 1;

      if (nextIndex >= nextSteps.length) {
        setShowingResults(true);
      } else {
        setIndex(nextIndex);
      }
    },
    [answers, currentQuestionId, index],
  );

  const handleBack = useCallback(() => {
    if (showingResults) {
      setShowingResults(false);
      return;
    }
    if (index > 0) setIndex(index - 1);
  }, [index, showingResults]);

  const handleRestart = useCallback(() => {
    setAnswers({});
    setIndex(0);
    setShowingResults(false);
  }, []);

  if (showingResults) {
    // We only reach this branch once every required answer is in place.
    const recommendations = recommend(answers as QuizAnswers, products);
    return (
      <QuizResult
        recommendations={recommendations}
        focusLabel={focusLabel(answers.primaryFocus)}
        onRestart={handleRestart}
      />
    );
  }

  if (!currentQuestion) {
    // Defensive — shouldn't happen, but a blank screen is worse than a restart link.
    return (
      <p className="text-center text-stone">
        Something went off-track.{' '}
        <button
          type="button"
          onClick={handleRestart}
          className="font-medium text-forest-700 underline underline-offset-2"
        >
          Start the quiz again
        </button>
        .
      </p>
    );
  }

  return (
    <QuizStep
      question={currentQuestion}
      stepNumber={index + 1}
      totalSteps={steps.length}
      selected={answers[currentQuestion.id] as string | undefined}
      onSelect={handleSelect}
      onBack={index > 0 ? handleBack : null}
    />
  );
}
