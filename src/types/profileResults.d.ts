import {
  FormSectionProps,
  FieldGroupOptionProps,
  FieldOptionProps,
  Conditions,
  FormAnswer,
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
  conditions: Record<string, string | string[]>;
}

export interface Framework {
  id: string;
  name: string;
  category: string;
  description: string;
  reference_url: string;
  is_baseline?: boolean;
  suppressed_by_baseline?: boolean;
  suppressed_by?: string[];
  evaluators: Evaluator[];
  first_steps: string[];
}

export interface EvaluatedFramework extends Framework {
  matchLevel: Evaluator['level'] | 'possible';
  matchReason: string;
  pendingMatches?: PendingFrameworkMatch[];
}

export interface PendingFrameworkMatch {
  level: Evaluator['level'];
  reason: string;
  conditions: {
    fieldId: string;
    fieldLabel: string;
    expectedLabels: string[];
  }[];
}

export interface FollowUp {
  fieldId: string;
  fieldLabel: string;
  action: string;
  owner: string;
  frameworkIds: string[];
}

export interface Match {
  tier: 'definite' | 'likely' | 'consider';
  [key: string]: EvaluatedFramework;
  reasons: string[];
};

export interface QuestionnaireSection {
  sectionTitle: string;
  answers: {
    fieldId: string;
    fieldLabel: string;
    selectedAnswers: FormAnswer[];
  }[];
}

export interface ComplianceProfile {
  date?: Date;
  rulesetVersion?: string;
  questionnaireAnswers?: QuestionnaireSection[];
  reviewerQuestions?: string;
  definite: EvaluatedFramework[];
  likely: EvaluatedFramework[];
  consider: EvaluatedFramework[];
  possible?: EvaluatedFramework[];
  followUps?: FollowUp[];
  identity: {
    clientName: string;
    preperName: string;
    logoImg: File | null;
  };
}
