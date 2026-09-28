// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

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
      options: [{ value: 'other', label: 'Other' }],
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

    act(() => profileState.handleAnswerChange('operating_regions', answer('canada')));
    expect(profileState.answers).not.toHaveProperty('us_states');
    expect(profileState.hasGeneratedProfile).toBe(false);
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
});
