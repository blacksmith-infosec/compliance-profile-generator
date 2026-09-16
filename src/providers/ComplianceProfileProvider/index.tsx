import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from 'react';

import {
  ComplianceProfile,
  Framework,
  Evaluator,
  EvaluatedFramework,
  SchemaField,
  SchemaSection,
} from '../../types/profileResults';
import formData from '../../../data/form-schema.json';
import frameworksData from '../../../data/frameworks.json';
import {
  FormAnswer,
  FormAnswers,
  FormSectionProps,
  FieldOptions,
} from '../../components/Form/form.d.tsx';
import { areAllFormSectionsComplete } from '../../components/Form/completion';

interface ComplianceProfileContextType {
  sections: FormSectionProps[];
  frameworks: Framework[];
  answers: FormAnswers;
  clientName: string;
  preperName: string;
  logoImg: File | null;
  indexOfExpandedSection: number;
  allSectionsComplete: boolean;
  hasGeneratedProfile: boolean;
  profile: ComplianceProfile;
  generateProfile: () => void;
  setIndexOfExpandedSection: (index: number) => void;
  handleAnswerChange: (fieldId: string, value: FormAnswer[]) => void;
  handleClientNameChange: (value: string) => void;
  handlePreperNameChange: (value: string) => void;
  handleLogoImgChange: (file: File | null) => void;
  resetForm: () => void;
}

interface ComplianceProfileProviderProps {
  children: ReactNode;
}

const normalizeFieldOptions = (field: SchemaField): FieldOptions => {
  const flatOptions = field.options;
  const groupedOptions = field.optionGroups;
  const hasFlatOptions = Array.isArray(flatOptions);
  const hasGroupedOptions = Array.isArray(groupedOptions);

  if (hasFlatOptions === hasGroupedOptions) {
    throw new Error(`Field ${field.id} must have exactly one of options or optionGroups.`);
  }

  if (hasFlatOptions) {
    return flatOptions;
  }

  const grouped = [...(groupedOptions ?? [])];
  if (field.ungroupedOptions && field.ungroupedOptions.length > 0) {
    grouped.push({ group: 'Other', options: field.ungroupedOptions });
  }

  return grouped;
};

const normalizeSections = (sections: SchemaSection[]): FormSectionProps[] => {
  return sections.map((section) => ({
    ...section,
    fields: section.fields.map((field) => ({
      id: field.id,
      type: field.type,
      fieldLabel: field.fieldLabel,
      fieldHelp: field.fieldHelp,
      conditional: field.conditional,
      conditions: field.conditions,
      options: normalizeFieldOptions(field),
    })),
    answers: {},
    onAnswerChange: () => undefined,
    setIndexOfExpandedSection: () => undefined,
  }));
};

const levelWeight: Record<Evaluator['level'], number> = {
  consider: 1,
  likely: 2,
  definite: 3,
};

const evaluateFramework = (framework: Framework, answers: FormAnswers): EvaluatedFramework | null => {
  let bestLevel: Evaluator['level'] | null = null;
  let bestReason = '';

  framework.evaluators.forEach((evaluator) => {
    const isMatch = Object.entries(evaluator.conditions).every(([field, value]) => {
      if (field.endsWith('_includes')) {
        const actualField = field.replace('_includes', '');
        const answer = answers[actualField];
        return Array.isArray(answer) && answer.some((item) => item.value === value);
      } else {
        const answer = answers[field];
        return Array.isArray(answer) && answer.some((item) => item.value === value);
      }
    });

    if (!isMatch) {
      return;
    }

    if (!bestLevel || levelWeight[evaluator.level] > levelWeight[bestLevel]) {
      bestLevel = evaluator.level;
      bestReason = evaluator.reason;
    }
  });

  if (!bestLevel) {
    return null;
  }

  return {
    ...framework,
    matchLevel: bestLevel,
    matchReason: bestReason,
  };
};

const evaluateProfile = (
  frameworks: Framework[],
  answers: FormAnswers,
  identity: ComplianceProfile['identity'],
): ComplianceProfile => {
  const definite: EvaluatedFramework[] = [];
  const likely: EvaluatedFramework[] = [];
  const consider: EvaluatedFramework[] = [];

  frameworks.forEach((framework) => {
    const result = evaluateFramework(framework, answers);
    if (!result) {
      return;
    }

    if (result.matchLevel === 'definite') {
      definite.push(result);
      return;
    }

    if (result.matchLevel === 'likely') {
      likely.push(result);
      return;
    }

    consider.push(result);
  });

  return {
    date: new Date(),
    definite,
    likely,
    consider,
    identity,
  };
};

const ComplianceProfileContext = createContext<ComplianceProfileContextType | undefined>(undefined);

const ComplianceProfileProvider = ({ children }: ComplianceProfileProviderProps) => {
  const sections = useMemo(
    () => normalizeSections(formData.sections as SchemaSection[]),
    [],
  );
  const frameworks = useMemo(
    () => (frameworksData.frameworks as Framework[]),
    [],
  );

  const [indexOfExpandedSection, setIndexOfExpandedSection] = useState(0);
  const [logoImg, setLogoImg] = useState<File | null>(null);
  const [answers, setAnswers] = useState<FormAnswers>({});
  const [clientName, setClientName] = useState('');
  const [preperName, setPreperName] = useState('');
  const [hasGeneratedProfile, setHasGeneratedProfile] = useState(false);

  const allSectionsComplete = areAllFormSectionsComplete(sections, answers);

  const handleAnswerChange = (fieldId: string, value: FormAnswer[]) => {
    setAnswers((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
    setHasGeneratedProfile(false);
  };

  const resetForm = () => {
    setAnswers({});
    setClientName('');
    setPreperName('');
    setLogoImg(null);
    setIndexOfExpandedSection(0);
    setHasGeneratedProfile(false);
  };

  const generateProfile = () => {
    setHasGeneratedProfile(true);
  };

  const profile = useMemo(
    () => evaluateProfile(frameworks, answers, { clientName, preperName, logoImg }),
    [frameworks, answers, clientName, preperName, logoImg],
  );

  const value: ComplianceProfileContextType = {
    sections,
    frameworks,
    answers,
    clientName,
    preperName,
    logoImg,
    indexOfExpandedSection,
    allSectionsComplete,
    hasGeneratedProfile,
    profile,
    generateProfile,
    setIndexOfExpandedSection,
    handleAnswerChange,
    handleClientNameChange: setClientName,
    handlePreperNameChange: setPreperName,
    handleLogoImgChange: setLogoImg,
    resetForm,
  };

  return (
    <ComplianceProfileContext.Provider value={value}>
      {children}
    </ComplianceProfileContext.Provider>
  );
};

export const useComplianceProfile = (): ComplianceProfileContextType => {
  const context = useContext(ComplianceProfileContext);
  if (!context) {
    throw new Error('useComplianceProfile must be used within ComplianceProfileProvider');
  }

  return context;
};

export default ComplianceProfileProvider;
