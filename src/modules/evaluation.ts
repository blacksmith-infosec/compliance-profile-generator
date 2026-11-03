import type {
  ComplianceProfile,
  Framework,
  Evaluator,
  EvaluatedFramework,
  PendingFrameworkMatch,
} from '../types/profileResults';
import type { FormAnswers } from '../components/Form/form.d.tsx';
import { getAnswerForField } from '../components/Form/completion';
import { generateFollowUps, getPendingCondition } from './followUps';
import { createQuestionnaireSnapshot } from './assessment';
import frameworksData from '../../data/frameworks.json';

const levelWeight: Record<Evaluator['level'], number> = {
  consider: 1,
  likely: 2,
  definite: 3,
};

export const evaluateFramework = (framework: Framework, answers: FormAnswers): EvaluatedFramework | null => {
  const matches: Evaluator[] = [];
  const pendingMatches: PendingFrameworkMatch[] = [];

  framework.evaluators.forEach((evaluator) => {
    const conditions: PendingFrameworkMatch['conditions'] = [];
    const compatible = Object.entries(evaluator.conditions).every(([field, expected]) => {
      const actualField = field.replace(/_(includes|in)$/, '');
      const answer = getAnswerForField(actualField, answers);
      const values = Array.isArray(expected) ? expected : [expected];
      if (answer?.some((item) => values.includes(item.value))) return true;
      if (!answer?.some((item) => item.value === 'unknown')) return false;

      const condition = getPendingCondition(actualField, values, answers);
      if (!condition) return false;
      conditions.push(condition);
      return true;
    });

    if (!compatible) return;
    if (conditions.length > 0) {
      pendingMatches.push({ level: evaluator.level, reason: evaluator.reason, conditions });
      return;
    }
    matches.push(evaluator);
  });

  if (matches.length === 0) {
    if (pendingMatches.length === 0) return null;
    const unresolvedLabels = [...new Set(pendingMatches.flatMap((match) =>
      match.conditions.map((condition) => condition.fieldLabel)))];
    return {
      ...framework,
      matchLevel: 'possible',
      matchReason: `May apply depending on ${unresolvedLabels.join('; ')}. Resolve these unknowns before deciding.`,
      pendingMatches,
    };
  }

  const bestLevel = matches.reduce<Evaluator['level']>((level, evaluator) =>
    levelWeight[evaluator.level] > levelWeight[level] ? evaluator.level : level, 'consider');
  const reasons = [...new Set(matches.filter((item) => item.level === bestLevel).map((item) => item.reason))];
  const pendingHigherMatches = pendingMatches.filter((match) => levelWeight[match.level] > levelWeight[bestLevel]);

  return {
    ...framework,
    matchLevel: bestLevel,
    matchReason: reasons.join(' '),
    ...(pendingHigherMatches.length > 0 ? { pendingMatches: pendingHigherMatches } : {}),
  };
};

export const evaluateProfile = (
  frameworks: Framework[],
  answers: FormAnswers,
  identity: ComplianceProfile['identity'],
  followUpOwners: Record<string, string> = {},
): ComplianceProfile => {
  const definite: EvaluatedFramework[] = [];
  const likely: EvaluatedFramework[] = [];
  const consider: EvaluatedFramework[] = [];
  const possible: EvaluatedFramework[] = [];

  const matches = frameworks.map((framework) => evaluateFramework(framework, answers))
    .filter((result): result is EvaluatedFramework => result !== null);
  const confirmedIds = new Set(matches.filter((result) => result.matchLevel !== 'possible').map((result) => result.id));
  const unsuppressed = matches.filter((result) => !result.suppressed_by?.some((id) => confirmedIds.has(id)));
  const baselineApplies = unsuppressed.some((result) =>
    result.is_baseline && ['definite', 'likely'].includes(result.matchLevel));

  const visibleMatches = unsuppressed.filter((result) => !baselineApplies || !result.suppressed_by_baseline);
  visibleMatches.forEach((result) => {

    if (result.matchLevel === 'possible') {
      possible.push(result);
      return;
    }

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
    rulesetVersion: frameworksData.rulesetVersion,
    questionnaireAnswers: createQuestionnaireSnapshot(answers),
    definite,
    likely,
    consider,
    possible,
    followUps: generateFollowUps(answers, visibleMatches, followUpOwners),
    identity,
  };
};

