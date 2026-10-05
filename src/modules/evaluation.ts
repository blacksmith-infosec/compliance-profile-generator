import type { ComplianceProfile, Framework, Evaluator, EvaluatedFramework } from '../types/profileResults';
import type { FormAnswers } from '../components/Form/form.d.tsx';
import { getAnswerForField } from '../components/Form/completion';

const levelWeight: Record<Evaluator['level'], number> = {
  consider: 1,
  likely: 2,
  definite: 3,
};

export const evaluateFramework = (framework: Framework, answers: FormAnswers): EvaluatedFramework | null => {
  const matches = framework.evaluators.filter((evaluator) =>
    Object.entries(evaluator.conditions).every(([field, expected]) => {
      const actualField = field.replace(/_(includes|in)$/, '');
      const answer = getAnswerForField(actualField, answers);
      const values = Array.isArray(expected) ? expected : [expected];
      return Array.isArray(answer) && answer.some((item) => values.includes(item.value));
    }));

  if (matches.length === 0) return null;

  const bestLevel = matches.reduce<Evaluator['level']>((level, evaluator) =>
    levelWeight[evaluator.level] > levelWeight[level] ? evaluator.level : level, 'consider');
  const reasons = [...new Set(matches.filter((item) => item.level === bestLevel).map((item) => item.reason))];

  return {
    ...framework,
    matchLevel: bestLevel,
    matchReason: reasons.join(' '),
  };
};

export const evaluateProfile = (
  frameworks: Framework[],
  answers: FormAnswers,
  identity: ComplianceProfile['identity'],
): ComplianceProfile => {
  const definite: EvaluatedFramework[] = [];
  const likely: EvaluatedFramework[] = [];
  const consider: EvaluatedFramework[] = [];

  const matches = frameworks.map((framework) => evaluateFramework(framework, answers))
    .filter((result): result is EvaluatedFramework => result !== null);
  const matchIds = new Set(matches.map((result) => result.id));
  const unsuppressed = matches.filter((result) => !result.suppressed_by?.some((id) => matchIds.has(id)));
  const baselineApplies = unsuppressed.some((result) => result.is_baseline && result.matchLevel !== 'consider');

  unsuppressed.filter((result) => !baselineApplies || !result.suppressed_by_baseline).forEach((result) => {

    if (result.matchLevel === 'definite') {
      definite.push(result);
      return;
    }

    if (result.matchLevel === 'likely') {
      likely.push(result);
      return;
    }

    consider.push(result);
  });

  return {
    date: new Date(),
    definite,
    likely,
    consider,
    identity,
  };
};

