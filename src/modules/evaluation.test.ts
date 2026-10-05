import { describe, expect, it } from 'vitest';
import frameworksData from '../../data/frameworks.json';
import type { Framework } from '../types/profileResults';
import type { FormAnswers } from '../components/Form/form.d.tsx';
import { evaluateFramework, evaluateProfile } from './evaluation';

const frameworks: Framework[] = frameworksData.frameworks;
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
});
