import React, { useRef } from 'react';
import FormSection from '../FormSection';
import ProfileIdentifier from '../ProfileIdentifier';
import {
  FormProps,
  FormSectionProps,
} from '../form.d.tsx';
import { useComplianceProfile } from '../../../providers/ComplianceProfileProvider';
import { getMissingFields, isSectionComplete } from '../completion';

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

  const missingBySection = sections.map((section, index) => ({
    section,
    index,
    missing: getMissingFields(section.fields, answers),
  })).filter(({ missing }) => missing.length > 0);

  const openMissingSection = (index: number, sectionNum: number) => {
    setIndexOfExpandedSection(index);
    document.querySelector(`[data-section="${sectionNum}"]`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <form id='profile-form' className='form-panel' ref={formRef}>
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
          precedingSectionsComplete={sections.slice(0, index).every((earlier) =>
            isSectionComplete(earlier.fields, answers))}
          collapsed={!(index === indexOfExpandedSection)} // First section should be displayed
        />
      ))}
      {!allSectionsComplete && (
        <div className='form-missing' role='status'>
          <p>To generate a profile, please answer:</p>
          <ul>
            {missingBySection.map(({ section, index, missing }) => (
              <li key={section.sectionNum}>
                <button
                  type='button'
                  className='form-missing-link'
                  onClick={() => openMissingSection(index, section.sectionNum)}
                >
                  {section.sectionTitle}
                </button>
                {': ' + missing.map((field) => field.fieldLabel).join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className = 'form-footer'>
        <button
          type='submit'
          className='btn btn-primary'
          disabled={!allSectionsComplete}
          onClick={(e) => {
            e.preventDefault();
            generateProfile();
          }}
        >
          Generate Profile
        </button>
        <button
          type='reset'
          className='btn btn-ghost'
          onClick={handleReset}
        >
          Reset
        </button>
      </div>
    </form>
  );
};

export default Form;
