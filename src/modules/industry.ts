// The form collects detailed business types while conditional questions use broad industry names.
const industryByBusinessType: Record<string, string> = {
  cpa_firm: 'financial_services',
  tax_prep: 'financial_services',
  investment_advisor: 'financial_services',
  bank_credit_union: 'financial_services',
  mortgage_broker: 'financial_services',
  insurance_agency: 'insurance',
  fintech: 'financial_services',

  medical_practice: 'healthcare',
  dental_practice: 'healthcare',
  veterinary_practice: 'healthcare',
  mental_health: 'healthcare',
  pharmacy: 'healthcare',
  healthcare_it: 'healthcare',
  health_insurance: 'healthcare',
  pharma_biotech: 'healthcare',

  law_firm: 'legal',
  k12_school: 'education',
  higher_ed: 'education',

  federal_civilian_contractor: 'government',
  defense_contractor: 'defense',
  state_local_government: 'government',
  nonprofit: 'nonprofit',

  saas: 'technology',
  msp_services: 'technology',
  cybersecurity_vendor: 'technology',
  other_technology: 'technology',

  retail_store: 'retail',
  ecommerce: 'retail',
  restaurant: 'hospitality',
  hotel: 'hospitality',

  real_estate_brokerage: 'real_estate',
  property_management: 'real_estate',

  consulting: 'professional_services',
  marketing_agency: 'professional_services',
  architecture_engineering: 'professional_services',
  recruiting_staffing: 'professional_services',

  manufacturing: 'manufacturing',
  construction: 'construction',
  energy: 'energy',
  transportation: 'transportation',
  other: 'other',
};

export const getIndustryFromBusinessType = (businessType: string): string | undefined => {
  return Object.prototype.hasOwnProperty.call(industryByBusinessType, businessType)
    ? industryByBusinessType[businessType]
    : undefined;
};
