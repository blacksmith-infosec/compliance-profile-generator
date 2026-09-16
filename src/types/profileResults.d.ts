import {
  FormSectionProps,
  FieldGroupOptionProps,
  FieldOptionProps,
  Conditions,
} from '../components/Form/form.d.tsx';

type SchemaFieldBase = {
  id: string;
  type: string;
  fieldLabel: string;
  fieldHelp?: string | null;
  conditional: boolean;
  conditions?: Conditions;
};

type SchemaField = SchemaFieldBase & {
  options?: FieldOptionProps[];
  optionGroups?: FieldGroupOptionProps[];
  ungroupedOptions?: FieldOptionProps[];
};

type SchemaSection = Omit<FormSectionProps, 'fields' | 'answers' | 'onAnswerChange' | 'setIndexOfExpandedSection'> & {
  fields: SchemaField[];
};

export interface Evaluator {
  level: 'definite' | 'likely' | 'consider';
  reason: string;
  conditions: Record<string, string>;
}

export interface Framework {
  id: string;
  name: string;
  category: string;
  description: string;
  reference_url: string;
  is_baseline?: boolean;
  suppressed_by_baseline?: boolean;
  evaluators: Evaluator[];
  first_steps: string[];
}

export interface EvaluatedFramework extends Framework {
  matchLevel: Evaluator['level'];
  matchReason: string;
}

export interface Match {
  tier: 'definite' | 'likely' | 'consider';
  [key: string]: EvaluatedFramework;
  reasons: string[];
};

export interface ComplianceProfile {
  date?: Date;
  definite: EvaluatedFramework[];
  likely: EvaluatedFramework[];
  consider: EvaluatedFramework[];
  identity: {
    clientName: string;
    preperName: string;
    logoImg: File | null;
  };
}
