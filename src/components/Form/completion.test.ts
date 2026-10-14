import { describe, expect, it } from 'vitest';

import formSchema from '../../../data/form-schema.json';
import type { FieldProps, FormAnswer, FormAnswers } from './form.d.tsx';
import {
  areAllFormSectionsComplete,
  evaluateConditions,
  getAnswerForField,
  getApplicableFields,
  getMissingFields,
  isSectionComplete,
  pruneInactiveAnswers,
  toggleCheckboxAnswer,
} from './completion';

const sections = formSchema.sections as unknown as Array<{
  sectionTitle: string;
  fields: FieldProps[];
}>;

const section = (title: string) => {
  const match = sections.find((item) => item.sectionTitle === title);
  if (!match) throw new Error(`Missing form section: ${title}`);
  return match;
};

const answer = (value: string): FormAnswer[] => [{ value, label: value, group: '' }];

const baseAnswers = (): FormAnswers => ({
  operating_regions: answer('canada'),
  business_type: answer('other'),
  public_status: answer('private'),
  data_types: answer('none'),
  customer_types: answer('consumers'),
});

const missingLabels = (title: string, answers: FormAnswers): string[] => (
  getMissingFields(section(title).fields, answers).map((field) => field.fieldLabel)
);

describe('form completion with conditional fields', () => {
  it('keeps None of these exclusive in checkbox answers', () => {
    const none = answer('none')[0];
    const pci = answer('pci')[0];

    expect(toggleCheckboxAnswer([pci], none)).toEqual([none]);
    expect(toggleCheckboxAnswer([none], pci)).toEqual([pci]);
  });

  it('keeps Unknown distinct from None and makes it exclusive with confirmed checkbox answers', () => {
    const unknown = answer('unknown')[0];
    const none = answer('none')[0];
    const pci = answer('pci')[0];

    expect(toggleCheckboxAnswer([pci], unknown)).toEqual([unknown]);
    expect(toggleCheckboxAnswer([none], unknown)).toEqual([unknown]);
    expect(toggleCheckboxAnswer([unknown], none)).toEqual([none]);
    expect(toggleCheckboxAnswer([unknown], pci)).toEqual([pci]);
    expect(toggleCheckboxAnswer([unknown], unknown)).toEqual([]);
  });

  it('shows dependent questions when upstream answers are unknown without treating missing answers as unknown', () => {
    const unknownRegion = { ...baseAnswers(), operating_regions: answer('unknown') };
    expect(missingLabels('Where you operate', unknownRegion)).toEqual(['US state operations']);
    expect(missingLabels('Where you operate', {})).toEqual(['Operating regions or data subjects']);

    const unknownBusiness = { ...baseAnswers(), business_type: answer('unknown') };
    expect(getAnswerForField('industry', unknownBusiness)).toEqual(answer('unknown'));
    expect(missingLabels('Operations', unknownBusiness)).toEqual([
      'Payment card handling', 'Critical infrastructure sector', 'Service provider role',
    ]);
    // A known Canadian region rules out US state revenue questions even with an unknown industry.
    expect(missingLabels('Organization', unknownBusiness)).toEqual([]);
  });

  it('does not hide unknown child answers until the parent is confirmed out of scope', () => {
    const answers = { ...baseAnswers(), data_types: answer('unknown'), card_handling: answer('unknown') };
    expect(pruneInactiveAnswers(sections, answers)).toHaveProperty('card_handling', answer('unknown'));
    expect(pruneInactiveAnswers(sections, { ...answers, data_types: answer('none') }))
      .not.toHaveProperty('card_handling');
  });

  it('combines uncertainty with known constraints for nested AND/OR conditions', () => {
    const conditions = [{
      conditions: [
        { field: 'us_states', operator: 'includes' as const, values: ['ny'] },
        { field: 'industry', operator: 'includes' as const, values: ['financial_services'] },
      ],
    }];
    expect(evaluateConditions(conditions, { us_states: answer('unknown'), business_type: answer('saas') }))
      .toBe(false);
    expect(evaluateConditions(conditions, { us_states: answer('unknown'), business_type: answer('fintech') }))
      .toBe(true);
    expect(evaluateConditions([{
      field: 'public_status', operator: 'not equal', values: ['public'],
    }], { public_status: answer('unknown') })).toBe(true);
  });

  it('removes conditional option answers when their jurisdiction is ruled out', () => {
    const fields = sections.flatMap((item) => item.fields);
    const answers = {
      ...baseAnswers(),
      operating_regions: answer('unknown'),
      customer_types: answer('businesses'),
      contracts: [...answer('dfars'), ...answer('soc2')],
      data_types: [...answer('cui'), ...answer('pii')],
    };
    expect(pruneInactiveAnswers([{ fields }], answers).contracts).toEqual(answers.contracts);

    const updated = pruneInactiveAnswers([{ fields }], { ...answers, operating_regions: answer('uk') });
    expect(updated.contracts).toEqual(answer('soc2'));
    expect(updated.data_types).toEqual(answer('pii'));
  });

  it('lets onboarding finish with unknown answers, including dependent questions', () => {
    const answers: FormAnswers = Object.fromEntries(
      sections.flatMap((item) => item.fields.map((field) => [field.id, answer('unknown')])),
    );
    expect(areAllFormSectionsComplete(sections, answers)).toBe(true);
  });

  it('permits a complete profile when no Operations question applies', () => {
    const answers = baseAnswers();

    expect(getApplicableFields(section('Operations').fields, answers)).toEqual([]);
    expect(isSectionComplete(section('Operations').fields, answers)).toBe(true);
    expect(areAllFormSectionsComplete(sections, answers)).toBe(true);
  });

  it('requires critical infrastructure information for an energy business', () => {
    const answers: FormAnswers = { ...baseAnswers(), business_type: answer('energy') };

    expect(missingLabels('Operations', answers)).toEqual(['Critical infrastructure sector']);
    expect(areAllFormSectionsComplete(sections, answers)).toBe(false);

    answers.critical_infra = answer('none');
    expect(areAllFormSectionsComplete(sections, answers)).toBe(true);
  });

  it('requires payment card handling when payment card data is selected', () => {
    const answers: FormAnswers = { ...baseAnswers(), data_types: answer('pci') };

    expect(missingLabels('Operations', answers)).toEqual(['Payment card handling']);
    expect(areAllFormSectionsComplete(sections, answers)).toBe(false);

    answers.card_handling = answer('processed');
    expect(areAllFormSectionsComplete(sections, answers)).toBe(true);
  });

  it('requires relevant Operations answers based on business type', () => {
    const retail = { ...baseAnswers(), business_type: answer('retail_store') };
    const technology = { ...baseAnswers(), business_type: answer('saas') };

    expect(missingLabels('Operations', retail)).toEqual(['Payment card handling']);
    expect(missingLabels('Operations', technology)).toEqual(['Service provider role']);
  });

  it('removes an Operations answer when its trigger no longer applies', () => {
    const answers: FormAnswers = {
      ...baseAnswers(),
      data_types: answer('pci'),
      card_handling: answer('processed'),
    };

    const updated = pruneInactiveAnswers(sections, {
      ...answers,
      data_types: answer('none'),
    });

    expect(updated).not.toHaveProperty('card_handling');
    expect(getApplicableFields(section('Operations').fields, updated)).toEqual([]);
    expect(areAllFormSectionsComplete(sections, updated)).toBe(true);
  });

  it('requires a provider role and a contracts answer for business customers', () => {
    const answers: FormAnswers = { ...baseAnswers(), customer_types: answer('businesses') };

    expect(missingLabels('Customers and contracts', answers)).toEqual([
      'Contractual or customer-imposed requirements',
    ]);
    expect(missingLabels('Operations', answers)).toEqual(['Service provider role']);
    expect(areAllFormSectionsComplete(sections, answers)).toBe(false);

    answers.contracts = answer('none');
    expect(missingLabels('Customers and contracts', answers)).toEqual([]);
    expect(areAllFormSectionsComplete(sections, answers)).toBe(false);

    answers.provider_role = answer('none');
    expect(areAllFormSectionsComplete(sections, answers)).toBe(true);
  });
});
