import {
  ConditionItem,
  Conditions,
  FieldProps,
  FormAnswer,
  FormAnswers,
  isGrouped,
} from './form.d.tsx';
import { getIndustryFromBusinessType } from '../../modules/industry';

const hasAnswer = (answer: FormAnswer[] | undefined): boolean => {
  return Array.isArray(answer) && answer.length > 0;
};

export const isFieldAnswered = (fieldId: string, answers: FormAnswers): boolean => {
  return hasAnswer(answers[fieldId]);
};

export const toggleCheckboxAnswer = (current: FormAnswer[], value: FormAnswer): FormAnswer[] => {
  if (current.some((item) => item.value === value.value)) {
    return current.filter((item) => item.value !== value.value);
  }
  if (value.value === 'none' || value.value === 'unknown') return [value];
  return [...current.filter((item) => item.value !== 'none' && item.value !== 'unknown'), value];
};

export const getAnswerForField = (fieldId: string, answers: FormAnswers): FormAnswer[] | undefined => {
  if (fieldId !== 'industry') return answers[fieldId];

  const businessType = answers.business_type?.[0]?.value;
  if (businessType === 'unknown') return answers.business_type;
  const industry = businessType && getIndustryFromBusinessType(businessType);
  return industry ? [{ value: industry, label: industry, group: '' }] : undefined;
};

type ConditionStatus = 'matched' | 'unmatched' | 'unknown';

const evaluateFieldCondition = (condition: ConditionItem, answers: FormAnswers): ConditionStatus => {
  if ('conditions' in condition) {
    return evaluateConditionStatus(condition.conditions, answers);
  }

  const answer = getAnswerForField(condition.field, answers);
  if (answer === undefined) return 'unmatched';
  if (answer.some((ans) => ans.value === 'unknown')) return 'unknown';

  const intersects = condition.values.some((value) => answer.some((ans) => ans.value === value));
  const matches = condition.operator === 'not equal' ? !intersects : intersects;
  return matches ? 'matched' : 'unmatched';
};

const evaluateConditionStatus = (conditions: Conditions | undefined, answers: FormAnswers): ConditionStatus => {
  if (!conditions || conditions.length === 0) return 'matched';

  let result = evaluateFieldCondition(conditions[0], answers);
  for (let index = 1; index < conditions.length; index += 1) {
    const item = conditions[index];
    const itemResult = evaluateFieldCondition(item, answers);
    const relation = item.conditionRelation ?? 'and';
    if (relation === 'or') {
      result = result === 'matched' || itemResult === 'matched' ? 'matched'
        : result === 'unknown' || itemResult === 'unknown' ? 'unknown' : 'unmatched';
    } else {
      result = result === 'unmatched' || itemResult === 'unmatched' ? 'unmatched'
        : result === 'unknown' || itemResult === 'unknown' ? 'unknown' : 'matched';
    }
  }

  return result;
};

// Keep questions and options visible until an explicit answer rules them out.
export const evaluateConditions = (conditions: Conditions | undefined, answers: FormAnswers): boolean => {
  return evaluateConditionStatus(conditions, answers) !== 'unmatched';
};

export const getApplicableFields = (fields: FieldProps[], answers: FormAnswers): FieldProps[] => {
  return fields.filter((field) => !field.conditional || evaluateConditions(field.conditions, answers));
};

export const getMissingFields = (fields: FieldProps[], answers: FormAnswers): FieldProps[] => {
  return getApplicableFields(fields, answers).filter((field) => !isFieldAnswered(field.id, answers));
};

export const pruneInactiveAnswers = (
  sections: Array<{ fields: FieldProps[] }>,
  answers: FormAnswers,
): FormAnswers => {
  const activeAnswers = { ...answers };
  sections.forEach((section) => {
    section.fields.forEach((field) => {
      if (field.conditional && !evaluateConditions(field.conditions, activeAnswers)) {
        delete activeAnswers[field.id];
        return;
      }

      const selected = activeAnswers[field.id];
      if (selected && field.options) {
        const options = isGrouped(field.options)
          ? field.options.flatMap((group) => group.options) : field.options;
        const visibleValues = new Set(options
          .filter((option) => evaluateConditions(option.conditions, activeAnswers))
          .map((option) => option.value));
        const retained = selected.filter((answer) => visibleValues.has(answer.value));
        if (retained.length === 0) delete activeAnswers[field.id];
        else activeAnswers[field.id] = retained;
      }
    });
  });
  return activeAnswers;
};

export const isSectionComplete = (fields: FieldProps[], answers: FormAnswers): boolean => {
  return fields.length > 0 && getMissingFields(fields, answers).length === 0;
};

export const areAllFormSectionsComplete = (
  sections: Array<{ fields: FieldProps[] }>,
  answers: FormAnswers,
): boolean => {
  return sections.length > 0 && sections.every((section) => isSectionComplete(section.fields, answers));
};
