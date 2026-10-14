import formSchema from '../../data/form-schema.json';
import type { FormAnswers } from '../components/Form/form.d.tsx';
import type { QuestionnaireSection, SchemaSection } from '../types/profileResults';

const sections = formSchema.sections as SchemaSection[];

export const createQuestionnaireSnapshot = (answers: FormAnswers): QuestionnaireSection[] => {
  const snapshot: QuestionnaireSection[] = [];

  // Record the inputs actually evaluated; the form prunes inactive answers before evaluation.
  for (const section of sections) {
    const sectionAnswers: QuestionnaireSection['answers'] = [];
    for (const field of section.fields) {
      const selectedAnswers = answers[field.id];
      if (!selectedAnswers?.length) continue;

      sectionAnswers.push({
        fieldId: field.id,
        fieldLabel: field.fieldLabel,
        selectedAnswers: selectedAnswers.map((answer) => ({ ...answer })),
      });
    }

    if (sectionAnswers.length === 0) continue;
    snapshot.push({ sectionTitle: section.sectionTitle, answers: sectionAnswers });
  }

  return snapshot;
};
