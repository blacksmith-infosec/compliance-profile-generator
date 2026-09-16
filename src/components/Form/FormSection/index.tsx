import React, { useRef } from 'react';
import {
  FieldGroupOptionProps,
  FieldOptions,
  FormSectionProps,
  FormAnswers,
  FormAnswer,
} from '../form.d.tsx';
import { evaluateConditions, isFieldAnswered, isSectionComplete } from '../completion';
import Dropdown from '../../Dropdown';
import Checkbox from '../../Checkbox';
import Radio from '../../Radio';


export const FormSection: React.FC<FormSectionProps> = ({
  id,
  sectionNum,
  sectionIndex,
  sectionTitle,
  fields,
  answers,
  onAnswerChange,
  className = '',
  setIndexOfExpandedSection,
  collapsed = false,
  disabled = false
}) => {
  const formRef = useRef<HTMLFieldSetElement>(null);

  const isFieldAnsweredInSection = (fieldId: string) => isFieldAnswered(fieldId, answers);

  const getMultiAnswer = (fieldId: string): string[] => {
    const answer = answers[fieldId];
    return Array.isArray(answer) ? answer.map((ans) => ans.value) : [];
  };

  const getSingleAnswer = (fieldId: string): string => {
    const answer = answers[fieldId];
    return Array.isArray(answer) && answer.length > 0 ? answer[0].value : '';
  };

  const isSectionCompleted = () => isSectionComplete(fields, answers);

  const setSingleValue = (fieldId: string, value: FormAnswer) => onAnswerChange(fieldId, [value]);

  const toggleCheckboxValue = (fieldId: string, value: FormAnswer) => {
    const current = Array.isArray(answers[fieldId]) ? answers[fieldId] : [];
    const next = current.some((item) => item.value === value.value)
      ? current.filter((item) => item.value !== value.value)
      : [...current, value];

    onAnswerChange(fieldId, next);
  };

  const isGrouped = (options: FieldOptions): options is FieldGroupOptionProps[] => {
    return options.length > 0 && 'group' in options[0];
  };

  const filterOptionsByConditions = (options: FieldOptions): FieldOptions => {
    if (!isGrouped(options)) {
      return options.filter((option) => evaluateConditions(option.conditions, answers));
    }

    return options
      .map((group) => ({
        ...group,
        options: group.options.filter((option) => evaluateConditions(option.conditions, answers)),
      }))
      .filter((group) => group.options.length > 0);
  };

  const summarize = () => {
    const pair:FormAnswers = {};
    fields
      .filter((field) => evaluateConditions(field.conditions, answers))
      .forEach((field) => {
        answers[field.id]?.forEach((ans) =>
          pair[field.id] ? pair[field.id].push(ans) : pair[field.id] = [ans]
          );
        }
      );
    const compiled = Object.entries(pair).map((sect) => sect[1].map((topic)=>topic.label).join(', ')).join(' \u00B7 ');
    return compiled;
  };

  const handleContinueClick = (e:React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    setIndexOfExpandedSection(sectionIndex+1);
    scrollToArea();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        setIndexOfExpandedSection(sectionIndex);
        scrollToArea();
        break;
    }
  };

  const handleSectionClick = () => {

    setIndexOfExpandedSection(sectionIndex);
    scrollToArea();
  };

  const scrollToArea = () => {
    formRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    !disabled &&
    <fieldset
      className={`form-section ${className} ${collapsed && 'collapsed'} ${isSectionCompleted() && 'completed'}`}
      ref={formRef}
      data-section={sectionNum}
      id={id}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <legend className='section-legend'
        onClick={handleSectionClick}
        onKeyDown={handleKeyDown}
      >
        <span className='section-marker'>
          <span className="section-check">✓</span>
          <span className="section-number">
            {String(sectionNum).padStart(2, '0')}
            <span className="section-dot">.</span>
          </span>
          <span className="section-title">{sectionTitle}</span>
        </span>
      </legend>
      {fields.map((field) => {
        const visibleOptions = filterOptionsByConditions(field.options);
        const shouldShowField = !field.conditional || evaluateConditions(field.conditions, answers);

        // if (!shouldShowField) {
        //   return null;
        // }

        return (
          <div
            key={field.id}
            className={'field'
              + `${field.conditional ? ' conditional' : ''}`
              + `${shouldShowField ? ' visible' : ''}`
              + `${isFieldAnsweredInSection(field.id) ? ' answered' : ''}`
            }
            data-field={field.id}
          >
            <div className="section-content">
              <span className="field-label">{field.fieldLabel}</span>
              <p className="field-help">{field.fieldHelp}</p>
              {field.type === 'checkbox' ? <Checkbox
                id={'checkbox_' + field.id}
                values={getMultiAnswer(field.id)}
                onChange={(value) => toggleCheckboxValue(field.id, value)}
                options={visibleOptions}
                placeholder="Select an option..." />
                : ''}
              {field.type === 'dropdown'
                ? <Dropdown
                  id={'dropdown_' + field.id}
                  value={getSingleAnswer(field.id)}
                  onChange={(value) => setSingleValue(field.id, value)}
                  options={visibleOptions}
                  placeholder="Select an option..." />
                : ''
              }
              {field.type === 'radio'
                ? <Radio
                  id={'radio_' + field.id}
                  value={getSingleAnswer(field.id)}
                  onChange={(value) => setSingleValue(field.id, value)}
                  options={visibleOptions}
                  placeholder="Select an option..." />
                : ''
              }
            </div>

          </div>
        );
      })}
      <div className="section-summary">
        {summarize()}
      </div>



      <div className="section-continue">
        <button
          type="button"
          className="btn btn-primary btn-small section-continue-btn"
          onClick={(e) => {handleContinueClick(e);}}>
          Continue
        </button>
      </div>
    </fieldset>
  );
};



export default FormSection;
