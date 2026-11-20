import type { OptionIndex, QuizQuestion } from '../../types.ts';

export function q(
  id: string,
  question: string,
  options: [string, string, string, string],
  correctIndex: OptionIndex,
  explanationUz: string,
): QuizQuestion {
  return { id, question, options, correctIndex, explanationUz };
}
