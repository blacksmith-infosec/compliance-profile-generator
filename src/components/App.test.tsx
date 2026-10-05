// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import App from './App';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
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
});
