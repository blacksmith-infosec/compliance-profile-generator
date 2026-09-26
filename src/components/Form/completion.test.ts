import { describe, expect, it } from 'vitest';

import formSchema from '../../../data/form-schema.json';
import type { FieldProps, FormAnswer, FormAnswers } from './form.d.tsx';
import {
  areAllFormSectionsComplete,
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
