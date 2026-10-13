import formSchema from '../../data/form-schema.json';
import type { FormAnswers, FieldOptionProps } from '../components/Form/form.d.tsx';
import { evaluateConditions } from '../components/Form/completion';
import type {
  EvaluatedFramework,
  FollowUp,
  PendingFrameworkMatch,
  SchemaField,
  SchemaSection,
} from '../types/profileResults';
import { getIndustryFromBusinessType } from './industry';

const fields = (formSchema.sections as SchemaSection[]).flatMap((section) => section.fields);
const fieldsById = new Map(fields.map((field) => [field.id, field]));

const getFieldOptions = (field: SchemaField): FieldOptionProps[] => [
  ...(field.options ?? []),
  ...(field.optionGroups ?? []).flatMap((group) => group.options),
  ...(field.ungroupedOptions ?? []),
];

export const getPendingCondition = (
  evaluatorField: string,
  expectedValues: string[],
  answers: FormAnswers,
): PendingFrameworkMatch['conditions'][number] | null => {
  const fieldId = evaluatorField === 'industry' ? 'business_type' : evaluatorField;
  const field = fieldsById.get(fieldId);
  if (!field) {
    return { fieldId, fieldLabel: fieldId.replace(/_/g, ' '), expectedLabels: expectedValues };
  }

  const expectedLabels = getFieldOptions(field)
    .filter((option) => evaluateConditions(option.conditions, answers))
    .filter((option) => expectedValues.includes(evaluatorField === 'industry'
      ? getIndustryFromBusinessType(option.value) ?? '' : option.value))
    .map((option) => option.label);

  // An unknown answer can only resolve to options that could be selected in the current form.
  if (expectedLabels.length === 0) return null;
  return { fieldId, fieldLabel: field.fieldLabel, expectedLabels: [...new Set(expectedLabels)] };
};

const followUpDetails: Record<string, { owner: string; action: string }> = {
  operating_regions: {
    owner: 'Business / privacy owner',
    action: 'Confirm where the organization operates and where its customers or data subjects are located.',
  },
  us_states: {
    owner: 'Business / privacy owner',
    action: 'Confirm which US states have operations, customers, or residents whose data is handled.',
  },
  business_type: {
    owner: 'Business owner',
    action: 'Confirm the organization\'s primary business activity and industry.',
  },
  revenue: {
    owner: 'Finance owner',
    action: 'Confirm the annual revenue range with Finance to resolve size-based compliance scope.',
  },
  employees: {
    owner: 'HR owner',
    action: 'Confirm the employee count with HR to resolve size-based compliance scope.',
  },
  public_status: {
    owner: 'Finance / legal owner',
    action: 'Confirm whether the company is private, publicly traded in the US, or planning an IPO.',
  },
  data_types: {
    owner: 'Privacy / data owner',
    action: 'Review the data inventory and confirm which sensitive data types are stored, processed, or transmitted.',
  },
  customer_types: {
    owner: 'Sales / account owner',
    action: 'Review customer records and confirm the types of organizations or people served.',
  },
  contracts: {
    owner: 'Legal / contract owner',
    action: 'Review customer contracts, security addenda, and insurance policies to confirm which requirements apply.',
  },
  card_handling: {
    owner: 'Finance / payments owner',
    action: 'Confirm whether payment card data is outsourced, directly handled, or supported for merchants.',
  },
  critical_infra: {
    owner: 'Operations owner',
    action: 'Confirm whether the organization operates critical infrastructure and which sector applies.',
  },
  provider_role: {
    owner: 'Service delivery owner',
    action: 'Confirm whether the organization acts as an MSP, MSSP, SaaS provider, or cloud infrastructure provider.',
  },
};

export const generateFollowUps = (
  answers: FormAnswers,
  frameworks: EvaluatedFramework[],
  owners: Record<string, string> = {},
): FollowUp[] => fields.filter((field) => answers[field.id]?.some((answer) => answer.value === 'unknown'))
  .map((field) => {
    const details = followUpDetails[field.id] ?? {
      owner: 'Business owner', action: `Confirm the answer to "${field.fieldLabel}".`,
    };
    const frameworkIds = frameworks.filter((framework) => framework.pendingMatches?.some((match) =>
      match.conditions.some((condition) => condition.fieldId === field.id))).map((framework) => framework.id);
    return {
      fieldId: field.id,
      fieldLabel: field.fieldLabel,
      action: details.action,
      owner: owners[field.id] ?? details.owner,
      frameworkIds: [...new Set(frameworkIds)],
    };
  });
