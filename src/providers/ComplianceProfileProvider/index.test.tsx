// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { FormAnswer } from '../../components/Form/form.d.tsx';
import ComplianceProfileProvider, { useComplianceProfile } from './index';

const answer = (value: string): FormAnswer[] => [{ value, label: value, group: '' }];

let profileState: ReturnType<typeof useComplianceProfile>;

const ProfileProbe = () => {
  profileState = useComplianceProfile();
  return <output>{profileState.allSectionsComplete ? 'Complete' : 'Incomplete'}</output>;
};

const mountProfile = () => render(
  <ComplianceProfileProvider>
    <ProfileProbe />
  </ComplianceProfileProvider>,
);

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  // A failed test should not leave a reference to a previous provider's state.
  profileState = undefined as unknown as ReturnType<typeof useComplianceProfile>;
});

describe('ComplianceProfileProvider', () => {
  it('requires a provider around consumers', () => {
    expect(() => render(<ProfileProbe />)).toThrow(
      'useComplianceProfile must be used within ComplianceProfileProvider',
    );
  });

  it('provides the real schema with grouped business choices and starts incomplete', () => {
    mountProfile();

    expect(profileState.sections.map((section) => section.sectionTitle)).toEqual([
      'Where you operate',
      'Organization',
      'Data handled',
      'Customers and contracts',
      'Operations',
    ]);
    const business = profileState.sections[1].fields.find((field) => field.id === 'business_type');
    expect(business?.options).toContainEqual({
      group: 'Other',
      options: [
        { value: 'other', label: 'Other' },
        { value: 'unknown', label: 'Unknown / needs verification' },
      ],
    });
    expect(profileState.answers).toEqual({});
    expect(profileState.indexOfExpandedSection).toBe(0);
    expect(profileState.allSectionsComplete).toBe(false);
    expect(profileState.hasGeneratedProfile).toBe(false);
  });

  it('removes answers to questions that stop applying and hides stale results', () => {
    mountProfile();

    act(() => profileState.handleAnswerChange('operating_regions', answer('us')));
    act(() => profileState.handleAnswerChange('us_states', answer('ca')));
    expect(profileState.answers.us_states).toEqual(answer('ca'));

    act(() => profileState.generateProfile());
    expect(profileState.hasGeneratedProfile).toBe(true);
    expect(profileState.profile.questionnaireAnswers?.flatMap((section) => section.answers.map((item) => item.fieldId)))
      .toContain('us_states');

    act(() => profileState.handleAnswerChange('operating_regions', answer('canada')));
    expect(profileState.answers).not.toHaveProperty('us_states');
    expect(profileState.hasGeneratedProfile).toBe(false);
    act(() => profileState.generateProfile());
    expect(profileState.profile.questionnaireAnswers?.flatMap((section) => section.answers.map((item) => item.fieldId)))
      .not.toContain('us_states');
  });

  it('ranks the strongest matching evaluator and includes supplied identity in the profile', () => {
    mountProfile();
    const logo = new File(['logo'], 'logo.png', { type: 'image/png' });

    act(() => {
      profileState.handleAnswerChange('data_types', answer('pci'));
      profileState.handleClientNameChange('Example Client');
      profileState.handlePreperNameChange('Example MSP');
      profileState.handleLogoImgChange(logo);
    });
    act(() => profileState.handleAnswerChange('card_handling', answer('redirected')));

    const pci = profileState.profile.definite.find((framework) => framework.id === 'pci_dss');
    expect(pci).toMatchObject({
      matchLevel: 'definite',
      matchReason: 'Handles payment card data',
    });
    expect(profileState.profile.likely.some((framework) => framework.id === 'pci_dss')).toBe(false);
    expect(profileState.profile.identity).toEqual({
      clientName: 'Example Client',
      preperName: 'Example MSP',
      logoImg: logo,
    });
    expect(profileState.profile.date).toBeInstanceOf(Date);
  });

  it('accepts unknown as a completed answer and assigns editable follow-up owners', () => {
    mountProfile();

    act(() => {
      profileState.handleAnswerChange('operating_regions', answer('canada'));
      profileState.handleAnswerChange('business_type', answer('saas'));
      profileState.handleAnswerChange('public_status', answer('private'));
      profileState.handleAnswerChange('data_types', answer('none'));
      profileState.handleAnswerChange('customer_types', answer('businesses'));
    });
    act(() => {
      profileState.handleAnswerChange('contracts', answer('unknown'));
      profileState.handleAnswerChange('provider_role', answer('saas'));
      profileState.generateProfile();
    });

    expect(profileState.allSectionsComplete).toBe(true);
    expect(profileState.profile.followUps).toEqual([
      expect.objectContaining({ fieldId: 'contracts', owner: expect.any(String) }),
    ]);
    expect(profileState.profile.definite.some((framework) => framework.id === 'iso_27001')).toBe(false);
    expect(profileState.profile.likely.find((framework) => framework.id === 'soc2')?.pendingMatches)
      .toEqual(expect.arrayContaining([expect.objectContaining({ level: 'definite' })]));

    act(() => profileState.handleFollowUpOwnerChange('contracts', 'Alex '));
    expect(profileState.profile.followUps?.[0].owner).toBe('Alex ');
    act(() => profileState.handleFollowUpOwnerChange('contracts', 'Alex Chen'));
    expect(profileState.profile.followUps?.[0].owner).toBe('Alex Chen');
    expect(profileState.hasGeneratedProfile).toBe(true);

    act(() => profileState.handleAnswerChange('contracts', answer('none')));
    expect(profileState.profile.followUps).toEqual([]);
    expect(profileState.hasGeneratedProfile).toBe(false);

    act(() => profileState.resetForm());
    act(() => {
      profileState.handleAnswerChange('business_type', answer('saas'));
      profileState.handleAnswerChange('contracts', answer('unknown'));
    });
    expect(profileState.profile.followUps?.[0].owner).not.toBe('Alex Chen');
  });

  it('resets answers, identity, section navigation, and generated results', () => {
    mountProfile();

    act(() => {
      profileState.handleAnswerChange('business_type', answer('other'));
      profileState.handleClientNameChange('Client');
      profileState.handlePreperNameChange('MSP');
      profileState.handleLogoImgChange(new File(['x'], 'logo.png'));
      profileState.setIndexOfExpandedSection(3);
      profileState.generateProfile();
    });
    expect(profileState.indexOfExpandedSection).toBe(3);
    expect(profileState.hasGeneratedProfile).toBe(true);

    act(() => profileState.resetForm());
    expect(profileState.answers).toEqual({});
    expect(profileState.profile.identity).toEqual({
      clientName: '',
      preperName: '',
      logoImg: null,
    });
    expect(profileState.indexOfExpandedSection).toBe(0);
    expect(profileState.hasGeneratedProfile).toBe(false);
  });

  it('records when the assessment is generated and retains that date while report details are edited', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T08:00:00Z'));
    mountProfile();
    act(() => {
      profileState.handleAnswerChange('business_type', answer('saas'));
      profileState.handleAnswerChange('customer_types', answer('businesses'));
    });
    act(() => profileState.handleAnswerChange('contracts', answer('unknown')));

    const assessmentDate = new Date('2026-10-02T10:30:00Z');
    vi.setSystemTime(assessmentDate);
    act(() => profileState.generateProfile());
    expect(profileState.profile.date).toEqual(assessmentDate);
    const recordedAnswers = profileState.profile.questionnaireAnswers;
    const rulesetVersion = profileState.profile.rulesetVersion;
    expect(recordedAnswers?.flatMap((section) => section.answers)).toContainEqual({
      fieldId: 'contracts',
      fieldLabel: 'Contractual or customer-imposed requirements',
      selectedAnswers: answer('unknown'),
    });
    expect(rulesetVersion).toBe('1.0.0');

    vi.setSystemTime(new Date('2026-10-03T15:00:00Z'));
    act(() => {
      profileState.handleFollowUpOwnerChange('contracts', 'Alex Chen');
      profileState.handleClientNameChange('Example Client');
      profileState.handlePreperNameChange('Example MSP');
      profileState.handleLogoImgChange(new File(['logo'], 'logo.png'));
    });
    expect(profileState.profile.followUps?.[0].owner).toBe('Alex Chen');
    expect(profileState.profile.identity.clientName).toBe('Example Client');
    expect(profileState.profile.date).toEqual(assessmentDate);
    expect(profileState.profile.questionnaireAnswers).toEqual(recordedAnswers);
    expect(profileState.profile.rulesetVersion).toBe(rulesetVersion);
    expect(profileState.hasGeneratedProfile).toBe(true);

    const reassessmentDate = new Date('2026-10-04T09:00:00Z');
    vi.setSystemTime(reassessmentDate);
    act(() => profileState.handleAnswerChange('contracts', answer('none')));
    expect(profileState.hasGeneratedProfile).toBe(false);
    act(() => profileState.generateProfile());
    expect(profileState.profile.date).toEqual(reassessmentDate);
    expect(profileState.profile.questionnaireAnswers?.flatMap((section) => section.answers)).toContainEqual({
      fieldId: 'contracts',
      fieldLabel: 'Contractual or customer-imposed requirements',
      selectedAnswers: answer('none'),
    });
  });

  it('includes reviewer questions in the report without changing its assessment date and clears them on reset', () => {
    vi.useFakeTimers();
    const assessmentDate = new Date('2026-10-02T10:30:00Z');
    vi.setSystemTime(assessmentDate);
    mountProfile();
    act(() => profileState.generateProfile());

    vi.setSystemTime(new Date('2026-10-03T15:00:00Z'));
    const questions = 'Does the new customer contract require SOC 2?\nWho will confirm the scope?';
    act(() => profileState.handleReviewerQuestionsChange(questions));
    expect(profileState.profile.reviewerQuestions).toBe(questions);
    expect(profileState.profile.date).toEqual(assessmentDate);
    expect(profileState.hasGeneratedProfile).toBe(true);

    act(() => profileState.resetForm());
    expect(profileState.profile.reviewerQuestions).toBe('');
    expect(profileState.hasGeneratedProfile).toBe(false);

    const reassessmentDate = new Date('2026-10-05T09:00:00Z');
    vi.setSystemTime(reassessmentDate);
    act(() => profileState.generateProfile());
    expect(profileState.profile.date).toEqual(reassessmentDate);
  });
});
