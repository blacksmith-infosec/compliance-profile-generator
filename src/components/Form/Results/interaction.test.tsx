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
      handleFollowUpOwnerChange: vi.fn(),
      handleReviewerQuestionsChange: vi.fn(),
      resetForm: vi.fn(),
    });

    render(<Results />);
    const reviewerQuestions = screen.getByRole('textbox', { name: 'Reviewer’s unresolved questions' });
    expect((reviewerQuestions as HTMLTextAreaElement).value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));

    expect(downloadProfilePDF).toHaveBeenCalledOnce();
    expect(downloadProfilePDF).toHaveBeenCalledWith(profile);
  });

  it('assigns a follow-up owner and can export a profile containing only unresolved answers', () => {
    const handleFollowUpOwnerChange = vi.fn();
    const profile: ComplianceProfile = {
      definite: [], likely: [], consider: [],
      followUps: [{
        fieldId: 'contracts', fieldLabel: 'Contract requirements', owner: 'Legal',
        action: 'Review signed contracts with the account owner.', frameworkIds: [],
      }],
      identity: { clientName: 'Client', preperName: 'MSP', logoImg: null },
    };
    vi.mocked(useComplianceProfile).mockReturnValue({
      sections: [], frameworks: [], answers: {},
      clientName: 'Client', preperName: 'MSP', logoImg: null,
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
      handleFollowUpOwnerChange,
      handleReviewerQuestionsChange: vi.fn(),
    });

    render(<Results />);
    const owner = screen.getByRole('textbox', { name: 'Owner for Contract requirements' });
    expect((owner as HTMLInputElement).value).toBe('Legal');
    fireEvent.change(owner, { target: { value: 'Alex Morgan' } });
    expect(handleFollowUpOwnerChange).toHaveBeenCalledWith('contracts', 'Alex Morgan');
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    expect(downloadProfilePDF).toHaveBeenCalledWith(profile);
  });

  it('edits reviewer questions and exports the updated generated profile', () => {
    const handleReviewerQuestionsChange = vi.fn();
    const profile: ComplianceProfile = {
      definite: [], likely: [], consider: [],
      followUps: [{
        fieldId: 'contracts', fieldLabel: 'Contract requirements', owner: 'Legal',
        action: 'Review signed customer contracts.', frameworkIds: [],
      }],
      identity: { clientName: 'Client', preperName: 'MSP', logoImg: null },
    };
    const context = {
      sections: [], frameworks: [], answers: {},
      clientName: 'Client', preperName: 'MSP', logoImg: null,
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
      handleFollowUpOwnerChange: vi.fn(),
      handleReviewerQuestionsChange,
    };
    vi.mocked(useComplianceProfile).mockReturnValue(context);

    const { rerender } = render(<Results />);
    const questions = 'Which contracts require an audit?\nDoes the new business line handle health records?';
    fireEvent.change(screen.getByRole('textbox', { name: 'Reviewer’s unresolved questions' }), {
      target: { value: questions },
    });
    expect(handleReviewerQuestionsChange).toHaveBeenCalledWith(questions);

    const updatedProfile = { ...profile, reviewerQuestions: questions };
    vi.mocked(useComplianceProfile).mockReturnValue({ ...context, profile: updatedProfile });
    rerender(<Results />);

    const reviewerQuestions = screen.getByRole('textbox', { name: 'Reviewer’s unresolved questions' });
    expect((reviewerQuestions as HTMLTextAreaElement).value).toBe(questions);
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    expect(downloadProfilePDF).toHaveBeenCalledWith(updatedProfile);
  });
});
