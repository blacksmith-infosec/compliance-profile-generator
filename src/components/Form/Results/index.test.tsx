import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Results from './index';
import { useComplianceProfile } from '../../../providers/ComplianceProfileProvider';
import type { ComplianceProfile, EvaluatedFramework } from '../../../types/profileResults';

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

const framework = (
  id: string,
  matchLevel: EvaluatedFramework['matchLevel'],
): EvaluatedFramework => ({
  id,
  name: `${id} framework`,
  category: 'Security',
  description: `${id} description`,
  reference_url: 'https://example.com',
  evaluators: [],
  first_steps: [`Start ${id}`, `Review ${id}`],
  matchLevel,
  matchReason: `Matched because of ${id}`,
});

const baseContext = {
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
};

describe('Results', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseComplianceProfile.mockReturnValue(baseContext);
  });

  it('shows a no-applicable-frameworks message when generated results are empty', () => {
    const html = renderToStaticMarkup(<Results />);

    expect(html).toContain('No applicable compliance frameworks were identified for the provided responses.');
    expect(html).not.toContain('Download PDF');
  });

  it('prompts for missing form answers before a profile is generated', () => {
    mockedUseComplianceProfile.mockReturnValue({
      ...baseContext,
      allSectionsComplete: false,
      hasGeneratedProfile: false,
    });

    const html = renderToStaticMarkup(<Results />);
    expect(html).toContain('Complete the form to generate a list of likely applicable frameworks and regulations.');
    expect(html).toContain('alt="Blacksmith logo"');
    expect(html).not.toContain('Download PDF');
  });

  it('prompts for generation when the form is complete', () => {
    mockedUseComplianceProfile.mockReturnValue({
      ...baseContext,
      hasGeneratedProfile: false,
    });

    const html = renderToStaticMarkup(<Results />);
    expect(html).toContain('Click Generate Profile to view applicable frameworks.');
    expect(html).not.toContain('Complete the form to generate');
  });

  it('groups matching frameworks by certainty and lists their first steps', () => {
    mockedUseComplianceProfile.mockReturnValue({
      ...baseContext,
      profile: {
        ...emptyProfile,
        definite: [framework('Definite', 'definite')],
        likely: [framework('Likely', 'likely')],
        consider: [framework('Consider', 'consider')],
      },
    });

    const html = renderToStaticMarkup(<Results />);
    expect(html).toContain('<h3>Definite</h3>');
    expect(html).toContain('<h3>Likely</h3>');
    expect(html).toContain('<h3>Consider</h3>');
    expect(html).toContain('Matched because of Definite');
    expect(html).toContain('<li>Start Likely</li><li>Review Likely</li>');
    expect(html).toContain('Download PDF');
  });

  it('omits empty certainty groups when other groups have matches', () => {
    mockedUseComplianceProfile.mockReturnValue({
      ...baseContext,
      profile: { ...emptyProfile, consider: [framework('Consider', 'consider')] },
    });

    const html = renderToStaticMarkup(<Results />);
    expect(html).toContain('<h3>Consider</h3>');
    expect(html).not.toContain('<h3>Definite</h3>');
    expect(html).not.toContain('<h3>Likely</h3>');
  });

});
