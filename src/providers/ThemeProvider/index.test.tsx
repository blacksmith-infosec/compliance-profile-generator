// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useTheme } from './index';

const ThemeConsumer = () => {
  const { theme } = useTheme();
  return <span>{theme}</span>;
};

afterEach(() => cleanup());

describe('useTheme', () => {
  it('reports a missing theme provider to consumers', () => {
    expect(() => render(<ThemeConsumer />)).toThrow(
      'useTheme must be used within ThemeProvider',
    );
  });
});
