export interface FormProps {
  id?: string;
  sections?: FormSectionProps[];
};

// export interface FormOption {
//   value: string;
//   label: string;
// }

export interface FormSectionProps {
  id?: string;
  sectionNum: number;
  sectionIndex: number;
  sectionTitle: string;
  fields: FieldProps[];
  answers: FormAnswers;
  onAnswerChange: (fieldId: string, value: FormAnswer[]) => void;
  className?: string;
  setIndexOfExpandedSection: (index: number) => void;
  collapsed?: boolean;
  disabled?: boolean;
}

export interface FieldCondition {
  conditionRelation?: "and" | "or";
  field: string;
  operator: "includes" | "equal" | "not equal";
  values: string[];
}

export interface GroupCondition {
  conditionRelation?: "and" | "or";
  conditions: ConditionItem[]; // This allows nesting
}

export type ConditionItem = FieldCondition | GroupCondition;

export type Conditions = ConditionItem[];

export type FormAnswers = Record<string, FormAnswer[]>;

export interface FormAnswer {
  value: string;
  label: string;
  group: string;
}

export interface FieldProps {
  id: string;
  type: string;
  fieldLabel: string;
  fieldHelp?: string | null;
  conditional: boolean;
  conditions?: Conditions;
  options: FieldOptions;
}

export interface FieldGroupOptionProps {
  group: string;
  options: FieldOptionProps[]
}

export interface FieldOptionProps {
  value: string;
  label: string;
  groupName?: string; //redundant group naming for backwards grouping
  conditions?: Conditions;
}

export type FieldOptions = FieldOptionProps[] | FieldGroupOptionProps[];

export const isGrouped = (opts: FieldOptions): opts is FieldGroupOptionProps[] => {
  return opts.length > 0 && 'group' in opts[0];
};