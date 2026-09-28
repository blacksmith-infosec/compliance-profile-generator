import {
  ConditionItem,
  Conditions,
  FieldProps,
  FormAnswer,
  FormAnswers,
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
  if (value.value === 'none') return [value];
  return [...current.filter((item) => item.value !== 'none'), value];
};

export const getAnswerForField = (fieldId: string, answers: FormAnswers): FormAnswer[] | undefined => {
  if (fieldId !== 'industry') return answers[fieldId];

  const businessType = answers.business_type?.[0]?.value;
  const industry = businessType && getIndustryFromBusinessType(businessType);
  return industry ? [{ value: industry, label: industry, group: '' }] : undefined;
};

const evaluateFieldCondition = (condition: ConditionItem, answers: FormAnswers): boolean => {
  if ('conditions' in condition) {
    return evaluateConditions(condition.conditions, answers);
  }

  const answer = getAnswerForField(condition.field, answers);
  if (answer === undefined) return false;

  const intersects = condition.values.some((value) => answer.some((ans) => ans.value === value));
  return condition.operator === 'not equal' ? !intersects : intersects;
};

export const evaluateConditions = (conditions: Conditions | undefined, answers: FormAnswers): boolean => {
  if (!conditions || conditions.length === 0) return true;

  let result = evaluateFieldCondition(conditions[0], answers);
  for (let index = 1; index < conditions.length; index += 1) {
    const item = conditions[index];
    const itemResult = evaluateFieldCondition(item, answers);
    const relation = item.conditionRelation ?? 'and';
    result = relation === 'or' ? result || itemResult : result && itemResult;
  }

  return result;
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
