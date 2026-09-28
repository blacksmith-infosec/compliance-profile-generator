// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import Results from './index';
import { useComplianceProfile } from '../../../providers/ComplianceProfileProvider';
import { downloadProfilePDF } from '../../../modules/pdf';
import type { ComplianceProfile } from '../../../types/profileResults';

vi.mock('../../../providers/ComplianceProfileProvider', () => ({
  useComplianceProfile: vi.fn(),
}));

vi.mock('../../../modules/pdf', () => ({
  downloadProfilePDF: vi.fn(),
}));

describe('Results download', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it('downloads the generated profile when Download PDF is clicked', () => {
    const profile: ComplianceProfile = {
      definite: [],
      likely: [{
        id: 'sample',
        name: 'Sample framework',
        category: 'Security',
        description: 'Sample description',
        reference_url: 'https://example.com',
        evaluators: [],
        first_steps: ['Review requirements'],
        matchLevel: 'likely',
        matchReason: 'A matching answer',
      }],
      consider: [],
      identity: { clientName: 'Client', preperName: 'MSP', logoImg: null },
    };

    vi.mocked(useComplianceProfile).mockReturnValue({
      sections: [],
      frameworks: [],
      answers: {},
      clientName: 'Client',
      preperName: 'MSP',
      logoImg: null,
      indexOfExpandedSection: 0,
      allSectionsComplete: true,
      hasGeneratedProfile: true,
      profile,
      generateProfile: vi.fn(),
      setIndexOfExpandedSection: vi.fn(),
      handleAnswerChange: vi.fn(),
      handleClientNameChange: vi.fn(),
      handlePreperNameChange: vi.fn(),
      handleLogoImgChange: vi.fn(),
      resetForm: vi.fn(),
    });

    render(<Results />);
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));

    expect(downloadProfilePDF).toHaveBeenCalledOnce();
    expect(downloadProfilePDF).toHaveBeenCalledWith(profile);
  });
});
