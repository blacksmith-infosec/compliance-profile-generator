import { describe, expect, it } from 'vitest';
import frameworksData from '../../data/frameworks.json';
import type { Framework } from '../types/profileResults';
import type { FormAnswers } from '../components/Form/form.d.tsx';
import { evaluateFramework, evaluateProfile } from './evaluation';

const frameworks = frameworksData.frameworks as Framework[];
const identity = { clientName: '', preperName: '', logoImg: null };
const answersFor = (values: Record<string, string | string[]>): FormAnswers =>
  Object.fromEntries(Object.entries(values).map(([field, value]) => [field,
    (Array.isArray(value) ? value : [value]).map((item) => ({ value: item, label: item, group: '' })),
  ]));
const framework = (id: string): Framework => {
  const result = frameworks.find((item) => item.id === id);
  if (!result) throw new Error(`Unknown framework: ${id}`);
  return result;
};
const profileFor = (values: Record<string, string | string[]>) =>
  evaluateProfile(frameworks, answersFor(values), identity);

describe('framework evaluation', () => {
  it('derives healthcare industry and retains all reasons at the highest matched level', () => {
    const result = evaluateFramework(framework('hipaa'), answersFor({
      business_type: 'medical_practice', operating_regions: 'us',
      data_types: 'phi', customer_types: 'healthcare_orgs',
    }));
    expect(result?.matchLevel).toBe('definite');
    expect(result?.matchReason).toContain('Industry is healthcare');
    expect(result?.matchReason).toContain('Handles Protected Health Information');
    expect(result?.matchReason).not.toContain('potential business associate');
  });

  it('does not match healthcare triggers for a non-US medical practice without PHI', () => {
    expect(evaluateFramework(framework('hipaa'), answersFor({
      business_type: 'medical_practice', operating_regions: 'uk', data_types: 'none',
    }))).toBeNull();
  });

  it.each(['50m_250m', 'over_250m'])('matches California revenue bracket %s', (revenue) => {
    const result = evaluateFramework(framework('ccpa_cpra'), answersFor({ us_states: 'ca', revenue }));
    expect(result?.matchLevel).toBe('definite');
  });

  it('keeps the California fallback for a lower revenue bracket', () => {
    const result = evaluateFramework(framework('ccpa_cpra'), answersFor({
      us_states: 'ca', revenue: '1m_10m',
    }));
    expect(result?.matchLevel).toBe('likely');
  });

  it('matches NIS2 size tiering for an EU manufacturing business', () => {
    const result = evaluateFramework(framework('nis2'), answersFor({
      business_type: 'manufacturing', operating_regions: 'eu', employees: '51_250',
    }));
    expect(result?.matchLevel).toBe('definite');
  });

  it('does not match size-triggered NY DFS rules when size answers are missing', () => {
    expect(evaluateFramework(framework('ny_dfs_500_class_a'), answersFor({
      business_type: 'bank_credit_union', us_states: 'ny',
    }))).toBeNull();
  });

  it.each([
    ['ny_dfs_500_class_a', 'over_1000', 'over_250m', true],
    ['ny_dfs_500_limited_exemption', '1_50', '1m_10m', false],
  ])('selects %s and follows its suppression metadata', (id, employees, revenue, keepsBase) => {
    const profile = profileFor({ business_type: 'bank_credit_union', us_states: 'ny', employees, revenue });
    const results = [...profile.definite, ...profile.likely, ...profile.consider];
    expect(results.some((item) => item.id === id)).toBe(true);
    expect(results.some((item) => item.id === 'ny_dfs_500')).toBe(keepsBase);
  });

  it('matches Texas safe harbor for the supported employee brackets', () => {
    expect(evaluateFramework(framework('tx_safe_harbor'), answersFor({
      us_states: 'tx', employees: '51_250',
    }))).not.toBeNull();
    expect(evaluateFramework(framework('tx_safe_harbor'), answersFor({
      us_states: 'tx', employees: 'over_1000',
    }))).toBeNull();
  });

  it('keeps generic baselines when no specific baseline applies', () => {
    const profile = profileFor({ business_type: 'other' });
    expect(profile.consider.map((item) => item.id)).toEqual(expect.arrayContaining(['nist_csf', 'cis_v8']));
  });

  it('suppresses generic baselines when a specific baseline applies', () => {
    const profile = profileFor({ contracts: 'iso27001' });
    expect(profile.definite.some((item) => item.id === 'iso_27001')).toBe(true);
    expect(profile.consider.some((item) => ['nist_csf', 'cis_v8'].includes(item.id))).toBe(false);
  });

  it('does not suppress generic baselines for a consider-only baseline match', () => {
    const specific = { ...framework('iso_27001'), evaluators: [
      { level: 'consider' as const, reason: 'Optional baseline', conditions: {} },
    ] };
    const profile = evaluateProfile([specific, framework('nist_csf')], {}, identity);
    expect(profile.consider.map((item) => item.id)).toContain('nist_csf');
  });

  it('distinguishes an unknown requirement from an explicit negative or an unanswered question', () => {
    const possible = evaluateFramework(framework('soc2'), answersFor({ contracts: 'unknown' }));
    expect(possible?.matchLevel).toBe('possible');
    expect(possible?.matchReason).toContain('Contractual or customer-imposed requirements');
    expect(possible?.pendingMatches).toEqual([{
      level: 'definite',
      reason: 'Customers require SOC 2 reports',
      conditions: [{
        fieldId: 'contracts',
        fieldLabel: 'Contractual or customer-imposed requirements',
        expectedLabels: ['Customer-mandated SOC 2 reports'],
      }],
    }]);
    expect(evaluateFramework(framework('soc2'), answersFor({ contracts: 'none' }))).toBeNull();
    expect(evaluateFramework(framework('soc2'), {})).toBeNull();
  });

  it('preserves a known tier while identifying the answer that could raise it', () => {
    const result = evaluateFramework(framework('soc2'), answersFor({
      provider_role: 'saas', contracts: 'unknown',
    }));
    expect(result?.matchLevel).toBe('likely');
    expect(result?.matchReason).toBe('Operates as a SaaS provider');
    expect(result?.pendingMatches?.[0].level).toBe('definite');
    expect(result?.pendingMatches?.[0].conditions[0].fieldId).toBe('contracts');
  });

  it('does not show speculative conditions that cannot improve an already confirmed tier', () => {
    const result = evaluateFramework(framework('iso_27001'), answersFor({
      operating_regions: 'unknown', contracts: 'iso27001',
    }));
    expect(result?.matchLevel).toBe('definite');
    expect(result?.pendingMatches).toBeUndefined();
  });

  it('keeps known mismatches and missing answers from becoming speculative matches', () => {
    expect(evaluateFramework(framework('hipaa'), answersFor({
      operating_regions: 'uk', data_types: 'unknown', business_type: 'other', customer_types: 'consumers',
    }))).toBeNull();
    expect(evaluateFramework(framework('ny_dfs_500_limited_exemption'), answersFor({
      business_type: 'bank_credit_union', us_states: 'ny', employees: 'unknown',
    }))).toBeNull();
  });

  it('only speculates about contractual requirements that could be selected in the current region', () => {
    const ukAnswers = answersFor({ operating_regions: 'uk', contracts: 'unknown' });
    expect(evaluateFramework(framework('cmmc'), ukAnswers)).toBeNull();
    expect(evaluateFramework(framework('nist_800_171'), ukAnswers)).toBeNull();
    expect(evaluateFramework(framework('soc2'), ukAnswers)?.matchLevel).toBe('possible');
    expect(evaluateFramework(framework('cmmc'), answersFor({
      operating_regions: 'unknown', contracts: 'unknown',
    }))?.matchLevel).toBe('possible');
  });

  it('maps an unknown derived industry back to the business question that must be resolved', () => {
    const result = evaluateFramework(framework('hipaa'), answersFor({
      business_type: 'unknown', operating_regions: 'us',
    }));
    expect(result?.matchLevel).toBe('possible');
    expect(result?.pendingMatches?.[0].conditions[0]).toMatchObject({
      fieldId: 'business_type', fieldLabel: 'Type of business',
    });
    expect(result?.pendingMatches?.[0].conditions[0].expectedLabels).toContain('Medical practice');
  });

  it('records all unresolved conditions and retains a known California fallback', () => {
    const result = evaluateFramework(framework('ccpa_cpra'), answersFor({ us_states: 'ca', revenue: 'unknown' }));
    expect(result?.matchLevel).toBe('likely');
    expect(result?.pendingMatches?.[0]).toMatchObject({
      level: 'definite',
      conditions: [{ fieldId: 'revenue', expectedLabels: ['$50M to $250M', 'Over $250M'] }],
    });
    const allUnknown = evaluateFramework(framework('ny_dfs_500_limited_exemption'), answersFor({
      business_type: 'bank_credit_union', us_states: 'ny', employees: 'unknown', revenue: 'unknown',
    }));
    expect(allUnknown?.matchLevel).toBe('possible');
    expect(allUnknown?.pendingMatches?.[0].conditions.map((condition) => condition.fieldId))
      .toEqual(['employees', 'revenue']);
  });

  it('keeps generic baselines and confirmed frameworks when only their suppressors are possible', () => {
    const profile = profileFor({
      business_type: 'bank_credit_union', operating_regions: 'us', us_states: 'ny',
      employees: 'unknown', revenue: 'unknown', contracts: 'unknown',
    });
    expect(profile.possible?.some((item) => item.id === 'ny_dfs_500_limited_exemption')).toBe(true);
    expect(profile.definite.some((item) => item.id === 'ny_dfs_500')).toBe(true);
    const contractOnly = profileFor({ contracts: 'unknown' });
    expect(contractOnly.possible?.some((item) => item.id === 'iso_27001')).toBe(true);
    expect(contractOnly.consider.map((item) => item.id)).toEqual(expect.arrayContaining(['nist_csf', 'cis_v8']));
  });

  it('generates one owned follow-up per unknown field and links all affected visible frameworks', () => {
    const profile = evaluateProfile(frameworks, answersFor({
      business_type: 'saas', contracts: 'unknown', provider_role: 'saas',
    }), identity, { contracts: 'Jane Doe' });
    expect(profile.followUps).toHaveLength(1);
    expect(profile.followUps?.[0]).toMatchObject({
      fieldId: 'contracts', fieldLabel: 'Contractual or customer-imposed requirements', owner: 'Jane Doe',
    });
    expect(profile.followUps?.[0].action).toContain('Review customer contracts');
    expect(profile.followUps?.[0].frameworkIds).toEqual(expect.arrayContaining(['soc2', 'iso_27001']));
  });

  it('creates follow-ups even when unknown answers cannot affect any framework', () => {
    const profile = evaluateProfile([], answersFor({ employees: 'unknown', contracts: 'none' }), identity);
    expect(profile.followUps).toEqual([{
      fieldId: 'employees', fieldLabel: 'Employee count',
      action: 'Confirm the employee count with HR to resolve size-based compliance scope.',
      owner: 'HR owner', frameworkIds: [],
    }]);
    expect(profile.possible).toEqual([]);
  });

  it('preserves owner edits including trailing spaces and deliberately empty assignments', () => {
    const answers = answersFor({ contracts: 'unknown' });
    expect(evaluateProfile([], answers, identity, { contracts: 'Jane ' }).followUps?.[0].owner).toBe('Jane ');
    expect(evaluateProfile([], answers, identity, { contracts: '' }).followUps?.[0].owner).toBe('');
  });
});
