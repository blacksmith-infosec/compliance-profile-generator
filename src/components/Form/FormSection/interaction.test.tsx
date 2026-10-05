// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import formData from '../../../../data/form-schema.json';
import type { FieldProps, FormAnswer, FormAnswers } from '../form.d.tsx';
import FormSection from './index';

const section = (title: string) => {
  const match = formData.sections.find((item) => item.sectionTitle === title);
  if (!match) throw new Error(`Missing form section: ${title}`);
  return match;
};

const answer = (value: string, label: string): FormAnswer => ({ value, label, group: '' });

const renderSection = (
  title: string,
  answers: FormAnswers,
  onAnswerChange = vi.fn(),
  setIndexOfExpandedSection = vi.fn(),
) => {
  const selected = section(title);
  return render(
    <FormSection
      sectionNum={selected.sectionNum}
      sectionIndex={formData.sections.indexOf(selected)}
      sectionTitle={title}
      fields={selected.fields as unknown as FieldProps[]}
      answers={answers}
      onAnswerChange={onAnswerChange}
      setIndexOfExpandedSection={setIndexOfExpandedSection}
      precedingSectionsComplete
    />
  );
};

describe('FormSection interactions', () => {
  afterEach(cleanup);

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('opens its section by clicking or pressing Enter or Space on the legend', () => {
    const setExpanded = vi.fn();
    const { container } = renderSection('Where you operate', {}, vi.fn(), setExpanded);
    const legend = container.querySelector('legend');
    if (!legend) throw new Error('Section legend was not rendered.');

    fireEvent.click(legend);
    fireEvent.keyDown(legend, { key: 'Enter' });
    fireEvent.keyDown(legend, { key: ' ' });
    fireEvent.keyDown(legend, { key: 'Escape' });

    expect(setExpanded).toHaveBeenCalledTimes(3);
    expect(setExpanded).toHaveBeenNthCalledWith(1, 0);
    expect(setExpanded).toHaveBeenNthCalledWith(2, 0);
    expect(setExpanded).toHaveBeenNthCalledWith(3, 0);
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledTimes(3);
  });

  it('advances to the next section when Continue is clicked', () => {
    const setExpanded = vi.fn();
    renderSection('Data handled', {}, vi.fn(), setExpanded);

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(setExpanded).toHaveBeenCalledOnce();
    expect(setExpanded).toHaveBeenCalledWith(3);
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  it('toggles checkbox answers while preserving other selections', () => {
    const onAnswerChange = vi.fn();
    const canada = answer('canada', 'Canada');
    const unitedStates = answer('us', 'United States');
    const selected = section('Where you operate');
    const props = {
      sectionNum: selected.sectionNum,
      sectionIndex: 0,
      sectionTitle: selected.sectionTitle,
      fields: selected.fields as unknown as FieldProps[],
      onAnswerChange,
      setIndexOfExpandedSection: vi.fn(),
    };
    const { rerender } = render(<FormSection {...props} answers={{ operating_regions: [canada] }} />);

    fireEvent.click(screen.getByRole('option', { name: 'United States' }));
    expect(onAnswerChange).toHaveBeenLastCalledWith('operating_regions', [canada, unitedStates]);

    rerender(<FormSection {...props} answers={{ operating_regions: [canada, unitedStates] }} />);
    fireEvent.click(screen.getByRole('option', { name: 'Canada' }));
    expect(onAnswerChange).toHaveBeenLastCalledWith('operating_regions', [unitedStates]);
  });

  it('starts a checkbox answer list when the field has no answer', () => {
    const onAnswerChange = vi.fn();
    renderSection('Where you operate', {}, onAnswerChange);

    fireEvent.click(screen.getByRole('option', { name: 'Canada' }));

    expect(onAnswerChange).toHaveBeenCalledWith('operating_regions', [answer('canada', 'Canada')]);
  });

  it('passes a selected dropdown answer as a single-value array', () => {
    const onAnswerChange = vi.fn();
    renderSection('Operations', { data_types: [answer('pci', 'Payment card data')] }, onAnswerChange);

    fireEvent.click(screen.getByRole('button', { name: /Select an option/ }));
    fireEvent.click(screen.getByRole('option', { name: 'Processes or stores cardholder data directly' }));

    expect(onAnswerChange).toHaveBeenCalledWith('card_handling', [
      expect.objectContaining(answer('processed', 'Processes or stores cardholder data directly')),
    ]);
  });

  it('passes a selected radio answer as a single-value array', () => {
    const onAnswerChange = vi.fn();
    renderSection('Operations', { business_type: [answer('energy', 'Energy / utilities')] }, onAnswerChange);

    fireEvent.click(screen.getByRole('option', { name: 'Energy / utilities (bulk electric system)' }));

    expect(onAnswerChange).toHaveBeenCalledWith('critical_infra', [
      answer('energy', 'Energy / utilities (bulk electric system)'),
    ]);
  });
});
