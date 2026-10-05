// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FormAnswer } from '../form.d.tsx';
import { useComplianceProfile } from '../../../providers/ComplianceProfileProvider';
import Form from './index';

vi.mock('../../../providers/ComplianceProfileProvider', () => ({
  useComplianceProfile: vi.fn(),
}));

const mockedProfile = vi.mocked(useComplianceProfile);
const answer = (value: string): FormAnswer[] => [{ value, label: value, group: '' }];
const sections: ReturnType<typeof useComplianceProfile>['sections'] = [
  {
    sectionNum: 1,
    sectionIndex: 0,
    sectionTitle: 'Where you operate',
    fields: [{
      id: 'operating_regions',
      type: 'dropdown',
      fieldLabel: 'Operating regions',
      conditional: false,
      options: [{ value: 'us', label: 'United States' }],
    }],
    answers: {},
    onAnswerChange: vi.fn(),
    setIndexOfExpandedSection: vi.fn(),
  },
  {
    sectionNum: 2,
    sectionIndex: 1,
    sectionTitle: 'Organization',
    fields: [{
      id: 'business_type',
      type: 'dropdown',
      fieldLabel: 'Business type',
      conditional: false,
      options: [{ value: 'other', label: 'Other' }],
    }],
    answers: {},
    onAnswerChange: vi.fn(),
    setIndexOfExpandedSection: vi.fn(),
  },
];

const setIndexOfExpandedSection = vi.fn();
const generateProfile = vi.fn();
const resetForm = vi.fn();
const handleClientNameChange = vi.fn();
const handlePreperNameChange = vi.fn();

const setProfileState = (overrides: Partial<ReturnType<typeof useComplianceProfile>> = {}) => {
  mockedProfile.mockReturnValue({
    sections,
    frameworks: [],
    answers: { operating_regions: answer('us') },
    clientName: '',
    preperName: '',
    logoImg: null,
    indexOfExpandedSection: 0,
    allSectionsComplete: false,
    hasGeneratedProfile: false,
    profile: { definite: [], likely: [], consider: [], identity: { clientName: '', preperName: '', logoImg: null } },
    generateProfile,
    setIndexOfExpandedSection,
    handleAnswerChange: vi.fn(),
    handleClientNameChange,
    handlePreperNameChange,
    handleLogoImgChange: vi.fn(),
    resetForm,
    ...overrides,
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
  setProfileState();
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
});

describe('Form', () => {
  it('lists missing answers, prevents generation, and opens the selected section', () => {
    render(<Form />);

    expect(screen.getByRole('button', { name: 'Generate Profile' }).hasAttribute('disabled')).toBe(true);
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Organization: Business type');
    expect(status.textContent).not.toContain('Where you operate:');

    fireEvent.click(screen.getByRole('button', { name: 'Organization' }));
    expect(setIndexOfExpandedSection).toHaveBeenCalledWith(1);
    expect(document.querySelector('[data-section="2"]')?.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  it('generates a completed profile and forwards optional identity edits', () => {
    setProfileState({
      answers: { operating_regions: answer('us'), business_type: answer('other') },
      allSectionsComplete: true,
    });
    render(<Form />);

    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.change(screen.getByPlaceholderText('Client or organization name'), {
      target: { value: 'Acme' },
    });
    fireEvent.change(screen.getByPlaceholderText('Your firm or MSP name'), {
      target: { value: 'MSP' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Profile' }));

    expect(handleClientNameChange).toHaveBeenCalledWith('Acme');
    expect(handlePreperNameChange).toHaveBeenCalledWith('MSP');
    expect(generateProfile).toHaveBeenCalledOnce();
  });

  it('resets the provider and scrolls to the top of the form', () => {
    const { container } = render(<Form />);

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(resetForm).toHaveBeenCalledOnce();
    expect(container.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });
});
