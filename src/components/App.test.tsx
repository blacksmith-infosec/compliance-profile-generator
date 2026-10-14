// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
});

afterEach(() => cleanup());

describe('App', () => {
  it('shows the assessment, incomplete guidance, and the result placeholder on first load', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('What applies to');
    expect(screen.getByRole('status').textContent).toContain('To generate a profile, please answer:');
    expect(screen.getByRole('button', { name: 'Generate Profile' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('Complete the form to generate a list of likely applicable frameworks and regulations.'))
      .toBeTruthy();
    expect(screen.getByRole('link', { name: 'Blacksmith InfoSec' })).toBeTruthy();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('restores the saved dark theme and persists a theme change', () => {
    localStorage.setItem('theme', 'dark');
    render(<App />);

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: 'Toggle theme' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('turns unknown contracts into owned follow-ups and removes them when requirements are confirmed absent', () => {
    const { container } = render(<App />);
    const selectAnswer = (fieldId: string, label: string) => {
      const field = container.querySelector<HTMLElement>(`[data-field="${fieldId}"]`);
      const legend = field?.closest('fieldset')?.querySelector('legend');
      if (!field || !legend) throw new Error(`Missing onboarding field: ${fieldId}`);
      fireEvent.click(legend);
      const dropdown = field.querySelector('.custom-dropdown-button');
      if (dropdown) fireEvent.click(dropdown);
      fireEvent.click(within(field).getByRole('option', { name: label }));
    };
    const resultGroup = (title: string) => within(
      screen.getByRole('heading', { level: 3, name: title }).closest('section')!,
    );

    selectAnswer('operating_regions', 'Canada');
    selectAnswer('business_type', 'SaaS / software company');
    selectAnswer('public_status', 'Private');
    selectAnswer('data_types', 'None of the above');
    selectAnswer('customer_types', 'Other businesses (B2B)');
    selectAnswer('contracts', 'Unknown / needs verification');
    selectAnswer('provider_role', 'SaaS provider');
    const generate = screen.getByRole('button', { name: 'Generate Profile' });
    expect(generate.hasAttribute('disabled')).toBe(false);
    fireEvent.click(generate);

    expect(resultGroup('Possible').getByText('ISO/IEC 27001:2022')).toBeTruthy();
    const soc2 = resultGroup('Likely').getByText('SOC 2 (Type 1 / Type 2)').closest<HTMLElement>('.framework-card')!;
    expect(within(soc2).getByText('Operates as a SaaS provider')).toBeTruthy();
    expect(within(soc2).getByText('Definite')).toBeTruthy();
    expect(within(soc2).getByText(/Customer-mandated SOC 2 reports/)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Follow-up items' })).toBeTruthy();
    const owner = screen.getByRole<HTMLInputElement>('textbox', {
      name: 'Owner for Contractual or customer-imposed requirements',
    });
    fireEvent.change(owner, { target: { value: 'Jane ' } });
    expect(owner.value).toBe('Jane ');
    fireEvent.change(owner, { target: { value: 'Jane Doe' } });
    expect(owner.value).toBe('Jane Doe');

    selectAnswer('contracts', 'None of these requirements');
    fireEvent.click(generate);
    expect(screen.queryByRole('heading', { name: 'Follow-up items' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Possible' })).toBeNull();
    expect(screen.queryByText('ISO/IEC 27001:2022')).toBeNull();
    expect(resultGroup('Likely').getByText('SOC 2 (Type 1 / Type 2)')).toBeTruthy();
    expect(resultGroup('Likely').queryByText(/Would qualify as/)).toBeNull();
  });
});
