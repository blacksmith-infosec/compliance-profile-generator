import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import formData from '../../../../data/form-schema.json';
import type { FieldProps, FormAnswers } from '../form.d.tsx';
import FormSection from './index';

const operations = formData.sections.find((section) => section.sectionTitle === 'Operations');
if (!operations) throw new Error('Operations section is missing from the form schema.');

const renderOperations = (
  answers: FormAnswers,
  collapsed = false,
  precedingSectionsComplete = true,
) => renderToStaticMarkup(
  <FormSection
    sectionNum={operations.sectionNum}
    sectionIndex={formData.sections.indexOf(operations)}
    sectionTitle={operations.sectionTitle}
    fields={operations.fields as unknown as FieldProps[]}
    answers={answers}
    onAnswerChange={() => undefined}
    setIndexOfExpandedSection={() => undefined}
    collapsed={collapsed}
    precedingSectionsComplete={precedingSectionsComplete}
  />
);

describe('Operations section guidance', () => {
  it('explains that no information is required when expanded and no questions apply', () => {
    const markup = renderOperations({});

    expect(markup).toMatch(
      /<p class="section-guidance section-guidance-optional">No operations information is required/
    );
    expect(markup).not.toContain('section-guidance-required');
  });

  it('summarizes the empty state when collapsed', () => {
    const markup = renderOperations({}, true);

    expect(markup).toMatch(/<fieldset class="form-section [^"]*collapsed/);
    expect(markup).toMatch(/<div class="section-summary">No operations information is required/);
  });

  it('waits for earlier answers before saying the section can be skipped', () => {
    const markup = renderOperations({}, false, false);

    expect(markup).toContain('Complete the earlier sections to see whether any operations information is needed.');
    expect(markup).not.toContain('No operations information is required');
  });

  it('names an applicable missing field instead of showing the empty state', () => {
    const markup = renderOperations({
      data_types: [{ value: 'pci', label: 'Payment card data', group: '' }],
    });

    expect(markup).toContain('<li>Payment card handling</li>');
    expect(markup).toContain('Still needed: Payment card handling');
    expect(markup).not.toContain('No operations information is required');
  });
});
