import { describe, expect, it } from 'vitest';

import { getIndustryFromBusinessType } from './industry';

describe('getIndustryFromBusinessType', () => {
  it('maps specific business choices to the broad industry used by conditions', () => {
    expect(getIndustryFromBusinessType('medical_practice')).toBe('healthcare');
    expect(getIndustryFromBusinessType('insurance_agency')).toBe('insurance');
  });

  it('ignores unknown and inherited object property names', () => {
    expect(getIndustryFromBusinessType('unknown')).toBeUndefined();
    expect(getIndustryFromBusinessType('toString')).toBeUndefined();
    expect(getIndustryFromBusinessType('__proto__')).toBeUndefined();
  });
});
