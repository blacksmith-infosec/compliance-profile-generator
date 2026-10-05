// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Radio from './index';

const options = [
  { value: 'alpha', label: 'Alpha' },
  { value: 'beta', label: 'Beta' },
  { value: 'gamma', label: 'Gamma' },
];

afterEach(cleanup);

describe('Radio', () => {
  it('shows the current choice and updates its selected state from props', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <Radio id='priority' value='beta' options={options} onChange={onChange} className='priority' />
    );

    const beta = screen.getByRole('option', { name: 'Beta' });
    expect(screen.getByRole('listbox').getAttribute('aria-labelledby')).toBe('priority');
    expect(beta.getAttribute('aria-selected')).toBe('true');
    expect(beta.classList.contains('selected')).toBe(true);
    expect(beta.parentElement?.parentElement?.classList.contains('priority')).toBe(true);
    expect(beta.parentElement?.parentElement?.classList.contains('answered')).toBe(true);

    rerender(<Radio value='gamma' options={options} onChange={onChange} />);
    expect(screen.getByRole('option', { name: 'Beta' }).getAttribute('aria-selected')).toBe('false');
    expect(screen.getByRole('option', { name: 'Gamma' }).getAttribute('aria-selected')).toBe('true');
  });

  it('reports the clicked choice and leaves the list visible', () => {
    const onChange = vi.fn();
    render(<Radio value='' options={options} onChange={onChange} />);

    fireEvent.click(screen.getByRole('option', { name: 'Alpha' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      value: 'alpha', label: 'Alpha', group: ''
    }));
    expect(screen.getByRole('listbox')).toBeTruthy();
  });

  it('shows groups as headings and includes the group in the selected answer', () => {
    const onChange = vi.fn();
    render(<Radio value='' onChange={onChange} options={[
      { group: 'Security', options: [{ value: 'mfa', label: 'MFA' }] },
      { group: 'Operations', options: [{ value: 'backup', label: 'Backups' }] },
    ]} />);

    expect(screen.getByText('Security')).toBeTruthy();
    expect(screen.getByText('Operations')).toBeTruthy();
    expect(screen.getAllByRole('option').map((item) => item.textContent)).toEqual(['MFA', 'Backups']);
    fireEvent.click(screen.getByText('Security'));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('option', { name: 'Backups' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      value: 'backup', label: 'Backups', group: 'Operations'
    }));
  });

  it('selects a focused option with Enter and clears focus on Escape and outside click', () => {
    const onChange = vi.fn();
    render(<Radio value='' options={options} onChange={onChange} />);
    const list = screen.getByRole('listbox');

    fireEvent.keyDown(list, { key: 'Home' });
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(screen.getByRole('option', { name: 'Beta' }).classList.contains('focused')).toBe(true);
    fireEvent.keyDown(list, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ value: 'beta' }));

    fireEvent.keyDown(list, { key: 'End' });
    expect(screen.getByRole('option', { name: 'Gamma' }).classList.contains('focused')).toBe(true);
    fireEvent.keyDown(list, { key: 'Escape' });
    expect(screen.getByRole('option', { name: 'Gamma' }).classList.contains('focused')).toBe(false);

    fireEvent.keyDown(list, { key: 'Home' });
    fireEvent.mouseDown(document.body);
    expect(screen.getByRole('option', { name: 'Alpha' }).classList.contains('focused')).toBe(false);
  });

  it('can choose the final option in a grouped list by keyboard', () => {
    const onChange = vi.fn();
    render(<Radio value='' onChange={onChange} options={[
      { group: 'First', options: [{ value: 'one', label: 'One' }] },
      { group: 'Second', options: [{ value: 'two', label: 'Two' }] },
    ]} />);

    const list = screen.getByRole('listbox');
    fireEvent.keyDown(list, { key: 'End' });
    fireEvent.keyDown(list, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      value: 'two', label: 'Two', group: 'Second'
    }));
  });

  it('does not report changes when disabled', () => {
    const onChange = vi.fn();
    render(<Radio value='' options={options} onChange={onChange} disabled />);
    const list = screen.getByRole('listbox');

    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.keyDown(list, { key: 'Enter' });
    fireEvent.click(screen.getByRole('option', { name: 'Alpha' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
