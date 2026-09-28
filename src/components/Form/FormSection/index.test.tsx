import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import formData from '../../../../data/form-schema.json';
import type { FieldProps, FormAnswers } from '../form.d.tsx';
import FormSection from './index';

const operations = formData.sections.find((section) => section.sectionTitle === 'Operations');
if (!operations) throw new Error('Operations section is missing from the form schema.');

const section = (title: string) => {
  const match = formData.sections.find((item) => item.sectionTitle === title);
  if (!match) throw new Error(`Missing form section: ${title}`);
  return match;
};

const answer = (value: string, label = value) => ({ value, label, group: '' });

const renderSection = (
  title: string,
  answers: FormAnswers,
  options: { collapsed?: boolean; disabled?: boolean; fields?: FieldProps[]; className?: string } = {},
) => {
  const selected = section(title);
  return renderToStaticMarkup(
    <FormSection
      id='test-section'
      sectionNum={selected.sectionNum}
      sectionIndex={formData.sections.indexOf(selected)}
      sectionTitle={title}
      fields={options.fields ?? selected.fields as unknown as FieldProps[]}
      answers={answers}
      onAnswerChange={() => undefined}
      setIndexOfExpandedSection={() => undefined}
      collapsed={options.collapsed}
      disabled={options.disabled}
      className={options.className}
    />
  );
};

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

describe('FormSection answers and conditional content', () => {
  it('does not render a disabled section', () => {
    expect(renderSection('Where you operate', {}, { disabled: true })).toBe('');
  });

  it('shows required fields, then marks the section complete when its applicable fields are answered', () => {
    const missing = renderSection('Where you operate', {});
    expect(missing).toContain('<li>Operating regions or data subjects</li>');
    expect(missing).toContain('Still needed: Operating regions or data subjects');
    expect(missing).not.toMatch(/<fieldset class="[^"]*completed/);

    const complete = renderSection('Where you operate', {
      operating_regions: [answer('canada', 'Canada')],
    }, { collapsed: true, className: 'custom' });
    expect(complete).toMatch(/<fieldset class="[^"]*custom[^"]*collapsed[^"]*completed/);
    expect(complete).toContain('<div class="section-summary">Canada</div>');
    expect(complete).not.toContain('section-guidance-required');
  });

  it('requires a conditional field only when its trigger is answered', () => {
    const withoutUs = renderSection('Where you operate', {
      operating_regions: [answer('canada', 'Canada')],
    });
    expect(withoutUs).toMatch(/class="field conditional" data-field="us_states"/);
    expect(withoutUs).not.toContain('Still needed: US state operations');

    const withUs = renderSection('Where you operate', {
      operating_regions: [answer('us', 'United States')],
    });
    expect(withUs).toMatch(/class="field conditional visible" data-field="us_states"/);
    expect(withUs).toContain('<li>US state operations</li>');
    expect(withUs).toContain('Still needed: US state operations');
  });

  it('summarizes several answers and excludes answers from inactive fields', () => {
    const complete = renderSection('Where you operate', {
      operating_regions: [answer('us', 'United States'), answer('canada', 'Canada')],
      us_states: [answer('ca', 'California')],
    });
    expect(complete).toContain('<div class="section-summary">United States, Canada · California</div>');

    const stale = renderSection('Where you operate', {
      operating_regions: [answer('canada', 'Canada')],
      us_states: [answer('ca', 'California')],
    });
    expect(stale).toContain('<div class="section-summary">Canada</div>');
    expect(stale).not.toContain('Still needed: US state operations');
  });

  it('filters flat conditional options using earlier answers', () => {
    const outsideUs = renderSection('Data handled', {});
    expect(outsideUs).toContain('Payment card data (cardholder or authentication data)');
    expect(outsideUs).not.toContain('Controlled Unclassified Information (CUI)');
    expect(outsideUs).not.toContain('Federal Contract Information (FCI)');

    const inUs = renderSection('Data handled', {
      operating_regions: [answer('us', 'United States')],
    });
    expect(inUs).toContain('Controlled Unclassified Information (CUI)');
    expect(inUs).toContain('Federal Contract Information (FCI)');
  });

  it('filters grouped options and removes groups without visible options', () => {
    const groupedField: FieldProps = {
      id: 'grouped',
      type: 'checkbox',
      fieldLabel: 'Grouped choices',
      conditional: false,
      options: [
        { group: 'US only', options: [{ value: 'restricted', label: 'Restricted', conditions: [
          { field: 'operating_regions', operator: 'includes', values: ['us'] },
        ] }] },
        { group: 'General', options: [
          { value: 'global', label: 'Global' },
          { value: 'also_us', label: 'Also US', conditions: [
            { field: 'operating_regions', operator: 'includes', values: ['us'] },
          ] },
        ] },
      ],
    };

    const outsideUs = renderSection('Data handled', {}, { fields: [groupedField] });
    expect(outsideUs).toContain('General');
    expect(outsideUs).toContain('Global');
    expect(outsideUs).not.toContain('US only');
    expect(outsideUs).not.toContain('Restricted');
    expect(outsideUs).not.toContain('Also US');

    const inUs = renderSection('Data handled', {
      operating_regions: [answer('us')],
    }, { fields: [groupedField] });
    expect(inUs).toContain('US only');
    expect(inUs).toContain('Restricted');
    expect(inUs).toContain('Also US');
  });

  it('renders dropdown and radio selections from their answers', () => {
    const markup = renderOperations({
      data_types: [answer('pci')],
      business_type: [answer('energy')],
      customer_types: [answer('businesses')],
      card_handling: [answer('processed', 'Processes or stores cardholder data directly')],
      critical_infra: [answer('energy', 'Energy / utilities (bulk electric system)')],
      provider_role: [answer('saas', 'SaaS provider')],
    });

    expect(markup).toContain('Processes or stores cardholder data directly');
    expect(markup).toMatch(/class="custom-radio-option selected [^"]*" role="option" aria-selected="true"/);
    expect(markup).toContain('SaaS provider');
    expect(markup).not.toContain('section-guidance-required');
  });
});
