import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Results from './index';
import { useComplianceProfile } from '../../../providers/ComplianceProfileProvider';
import type { ComplianceProfile } from '../../../types/profileResults';

vi.mock('../../../providers/ComplianceProfileProvider', () => ({
  useComplianceProfile: vi.fn(),
}));

const mockedUseComplianceProfile = vi.mocked(useComplianceProfile);

const emptyProfile: ComplianceProfile = {
  definite: [],
  likely: [],
  consider: [],
  identity: {
    clientName: '',
    preperName: '',
    logoImg: null,
  },
};

describe('Results', () => {
  beforeEach(() => {
    mockedUseComplianceProfile.mockReturnValue({
      sections: [],
      frameworks: [],
      answers: {},
      clientName: '',
      preperName: '',
      logoImg: null,
      indexOfExpandedSection: 0,
      allSectionsComplete: true,
      hasGeneratedProfile: true,
      profile: emptyProfile,
      generateProfile: vi.fn(),
      setIndexOfExpandedSection: vi.fn(),
      handleAnswerChange: vi.fn(),
      handleClientNameChange: vi.fn(),
      handlePreperNameChange: vi.fn(),
      handleLogoImgChange: vi.fn(),
      resetForm: vi.fn(),
    });
  });

  it('shows a no-applicable-frameworks message when generated results are empty', () => {
    const html = renderToStaticMarkup(<Results />);

    expect(html).toContain('No applicable compliance frameworks were identified for the provided responses.');
    expect(html).not.toContain('Complete the form to generate recommended compliance frameworks.');
  });
});
