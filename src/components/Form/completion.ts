import {
  ConditionItem,
  Conditions,
  FieldProps,
  FormAnswer,
  FormAnswers,
} from './form.d.tsx';

const hasAnswer = (answer: FormAnswer[] | undefined): boolean => {
  return Array.isArray(answer) && answer.length > 0;
};

export const isFieldAnswered = (fieldId: string, answers: FormAnswers): boolean => {
  return hasAnswer(answers[fieldId]);
};

const evaluateFieldCondition = (condition: ConditionItem, answers: FormAnswers): boolean => {
  if ('conditions' in condition) {
    return evaluateConditions(condition.conditions, answers);
  }

  const answer = answers[condition.field];
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

export const isSectionComplete = (fields: FieldProps[], answers: FormAnswers): boolean => {
  return (
    fields.length > 0
    && fields
      .filter((field) => evaluateConditions(field.conditions, answers))
      .every((field) => isFieldAnswered(field.id, answers))
  );
};

export const areAllFormSectionsComplete = (
  sections: Array<{ fields: FieldProps[] }>,
  answers: FormAnswers,
): boolean => {
  return sections.length > 0 && sections.every((section) => isSectionComplete(section.fields, answers));
};