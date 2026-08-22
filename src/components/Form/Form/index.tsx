import React, { useRef } from 'react';
import FormSection from '../FormSection';
import ProfileIdentifier from '../ProfileIdentifier';
import {
  FormProps,
  FormSectionProps,
} from '../form.d.tsx';
import { useComplianceProfile } from '../../../providers/ComplianceProfileProvider';

export const Form: React.FC<FormProps> = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const {
    sections,
    answers,
    clientName,
    preperName,
    logoImg,
    indexOfExpandedSection,
    allSectionsComplete,
    setIndexOfExpandedSection,
    handleAnswerChange,
    handleClientNameChange,
    handlePreperNameChange,
    handleLogoImgChange,
    resetForm,
    generateProfile,
  } = useComplianceProfile();

  const handleReset = () => {
    resetForm();
    //Reset Focus
    formRef?.current?.parentElement?.scrollIntoView({
      behavior: 'smooth',
      block: 'start', 
    });
  };

  return (
    <form id="profile-form" className="form-pannel" ref={formRef}>
      <ProfileIdentifier
        clientName={clientName}
        preperName={preperName}
        logoImg={logoImg}
        handleClientNameChange={handleClientNameChange}
        handlePreperNameChange={handlePreperNameChange}
        handleLogoImgChange={handleLogoImgChange}
      />
      {sections.map((sec: FormSectionProps, index) => (
        <FormSection
          key={`sec-${sec.sectionNum}`}
          sectionNum={sec.sectionNum ?? index}
          sectionIndex={index}
          sectionTitle={sec.sectionTitle}
          fields={sec.fields}
          answers={answers}
          onAnswerChange={handleAnswerChange}
          setIndexOfExpandedSection={setIndexOfExpandedSection}
          collapsed={!(index === indexOfExpandedSection)} // First section should be displayed
        />
      ))}
      <div className = "form-footer">
        <button 
          type="submit"
          className="btn btn-primary" 
          disabled={!allSectionsComplete}
          onClick={(e) => {
            e.preventDefault();
            generateProfile();
          }}
        >
          Generate Profile
        </button>
        <button 
          type="reset" 
          className="btn btn-ghost" 
          onClick={handleReset}
        >
          Reset
        </button>
      </div>
    </form>
  );
};

export default Form;