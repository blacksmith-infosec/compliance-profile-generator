// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Dropdown from './index';

const options = [
  { value: 'alpha', label: 'Alpha' },
  { value: 'beta', label: 'Beta' },
  { value: 'gamma', label: 'Gamma' },
];

afterEach(cleanup);

describe('Dropdown', () => {
  it('shows a placeholder until its controlled value is selected', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <Dropdown id='choice' value='' options={options} onChange={onChange} placeholder='Choose one' />
    );

    const button = screen.getByRole('button');
    expect(button.textContent).toContain('Choose one');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('listbox')).toBeNull();

    rerender(<Dropdown id='choice' value='beta' options={options} onChange={onChange} />);
    expect(button.textContent).toContain('Beta');
    expect(button.parentElement?.classList.contains('answered')).toBe(true);
  });

  it('opens on click and sends a selected option to the caller', () => {
    const onChange = vi.fn();
    render(<Dropdown value='beta' options={options} onChange={onChange} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('option', { name: 'Beta' }).getAttribute('aria-selected')).toBe('true');

    fireEvent.click(screen.getByRole('option', { name: 'Gamma' }));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      value: 'gamma', label: 'Gamma', group: ''
    }));
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);
  });

  it('keeps the group name when choosing an option from grouped data', () => {
    const onChange = vi.fn();
    render(<Dropdown value='' onChange={onChange} options={[
      { group: 'Security', options: [{ value: 'mfa', label: 'MFA' }] },
      { group: 'Operations', options: [{ value: 'backup', label: 'Backups' }] },
    ]} />);

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['MFA', 'Backups']);
    fireEvent.click(screen.getByRole('option', { name: 'Backups' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      value: 'backup', label: 'Backups', group: 'Operations'
    }));
  });

  it('supports arrow keys, Enter, Escape, and clicking outside', () => {
    const onChange = vi.fn();
    render(<Dropdown value='' options={options} onChange={onChange} />);
    const button = screen.getByRole('button');

    fireEvent.keyDown(button, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeTruthy();
    fireEvent.keyDown(button, { key: 'ArrowDown' });
    fireEvent.keyDown(button, { key: 'ArrowDown' });
    expect(screen.getByRole('option', { name: 'Beta' }).classList.contains('focused')).toBe(true);
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ value: 'beta' }));
    expect(screen.queryByRole('listbox')).toBeNull();

    fireEvent.keyDown(button, { key: ' ' });
    expect(screen.getByRole('listbox')).toBeTruthy();
    fireEvent.keyDown(button, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();

    fireEvent.click(button);
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Alpha' }));
    expect(screen.getByRole('listbox')).toBeTruthy();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('supports Home and End navigation without moving past the available choices', () => {
    const onChange = vi.fn();
    render(<Dropdown value='' options={options} onChange={onChange} />);
    const button = screen.getByRole('button');

    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.keyDown(button, { key: 'End' });
    expect(screen.getByRole('option', { name: 'Gamma' }).classList.contains('focused')).toBe(true);
    fireEvent.keyDown(button, { key: 'ArrowDown' });
    expect(screen.getByRole('option', { name: 'Gamma' }).classList.contains('focused')).toBe(true);
    fireEvent.keyDown(button, { key: 'ArrowUp' });
    expect(screen.getByRole('option', { name: 'Beta' }).classList.contains('focused')).toBe(true);
    fireEvent.keyDown(button, { key: 'Home' });
    expect(screen.getByRole('option', { name: 'Alpha' }).classList.contains('focused')).toBe(true);
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ value: 'alpha' }));
  });

  it('ignores clicks and keyboard commands when disabled', () => {
    const onChange = vi.fn();
    render(<Dropdown value='' options={options} onChange={onChange} disabled />);
    const button = screen.getByRole('button') as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    fireEvent.keyDown(button, { key: 'ArrowDown' });
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
