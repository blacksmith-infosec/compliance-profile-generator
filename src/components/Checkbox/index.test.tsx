// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Checkbox from './index';

const options = [
  { value: 'alpha', label: 'Alpha' },
  { value: 'beta', label: 'Beta' },
  { value: 'gamma', label: 'Gamma' },
];

afterEach(cleanup);

describe('Checkbox', () => {
  it('renders its controlled selections and updates them when props change', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <Checkbox id='topics' values={['beta']} options={options} onChange={onChange} className='topics' />
    );

    const beta = screen.getByRole('option', { name: 'Beta' });
    expect(screen.getByRole('listbox').getAttribute('aria-labelledby')).toBe('topics');
    expect(beta.classList.contains('selected')).toBe(true);
    expect(beta.getAttribute('aria-selected')).toBe('true');
    expect(beta.parentElement?.parentElement?.classList.contains('topics')).toBe(true);
    expect(beta.parentElement?.parentElement?.classList.contains('answered')).toBe(true);

    rerender(<Checkbox values={['alpha', 'gamma']} options={options} onChange={onChange} />);
    expect(screen.getByRole('option', { name: 'Beta' }).getAttribute('aria-selected')).toBe('false');
    expect(screen.getByRole('option', { name: 'Gamma' }).getAttribute('aria-selected')).toBe('true');
  });

  it('reports a clicked option and leaves the list available for another selection', () => {
    const onChange = vi.fn();
    render(<Checkbox values={[]} options={options} onChange={onChange} />);

    fireEvent.click(screen.getByRole('option', { name: 'Alpha' }));
    fireEvent.click(screen.getByRole('option', { name: 'Gamma' }));
    expect(onChange).toHaveBeenNthCalledWith(1, { value: 'alpha', label: 'Alpha', group: '' });
    expect(onChange).toHaveBeenNthCalledWith(2, { value: 'gamma', label: 'Gamma', group: '' });
    expect(screen.getByRole('listbox')).toBeTruthy();
  });

  it('labels grouped options and does not select group headings', () => {
    const onChange = vi.fn();
    render(<Checkbox values={[]} onChange={onChange} options={[
      { group: 'Security', options: [{ value: 'mfa', label: 'MFA' }] },
      { group: 'Operations', options: [{ value: 'backup', label: 'Backups' }] },
    ]} />);

    expect(screen.getByText('Security')).toBeTruthy();
    expect(screen.getByText('Operations')).toBeTruthy();
    expect(screen.getAllByRole('option').map((item) => item.textContent)).toEqual(['MFA', 'Backups']);
    fireEvent.click(screen.getByText('Security'));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('option', { name: 'Backups' }));
    expect(onChange).toHaveBeenCalledWith({ value: 'backup', label: 'Backups', group: 'Operations' });
  });

  it('supports keyboard navigation and resets the highlighted choice on Escape and outside click', () => {
    const onChange = vi.fn();
    render(<Checkbox values={[]} options={options} onChange={onChange} />);
    const list = screen.getByRole('listbox');

    fireEvent.keyDown(list, { key: 'End' });
    expect(screen.getByRole('option', { name: 'Gamma' }).classList.contains('focused')).toBe(true);
    fireEvent.keyDown(list, { key: 'ArrowUp' });
    expect(screen.getByRole('option', { name: 'Beta' }).classList.contains('focused')).toBe(true);
    fireEvent.keyDown(list, { key: ' ' });
    expect(onChange).toHaveBeenCalledWith({ value: 'beta', label: 'Beta', group: '' });

    fireEvent.keyDown(list, { key: 'Home' });
    expect(screen.getByRole('option', { name: 'Alpha' }).classList.contains('focused')).toBe(true);
    fireEvent.keyDown(list, { key: 'Escape' });
    expect(screen.getByRole('option', { name: 'Alpha' }).classList.contains('focused')).toBe(false);

    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.mouseDown(document.body);
    expect(screen.getByRole('option', { name: 'Alpha' }).classList.contains('focused')).toBe(false);
  });

  it('can select the last option in a grouped list by keyboard', () => {
    const onChange = vi.fn();
    render(<Checkbox values={[]} onChange={onChange} options={[
      { group: 'First', options: [{ value: 'one', label: 'One' }] },
      { group: 'Second', options: [{ value: 'two', label: 'Two' }] },
    ]} />);

    const list = screen.getByRole('listbox');
    fireEvent.keyDown(list, { key: 'End' });
    fireEvent.keyDown(list, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith({ value: 'two', label: 'Two', group: 'Second' });
  });

  it('does not change selections when disabled', () => {
    const onChange = vi.fn();
    render(<Checkbox values={[]} options={options} onChange={onChange} disabled />);
    const list = screen.getByRole('listbox');

    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.keyDown(list, { key: 'Enter' });
    fireEvent.click(screen.getByRole('option', { name: 'Alpha' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
