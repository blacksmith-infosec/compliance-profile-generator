import React, { useState, useRef, useEffect } from 'react';
import './radio.css';
import { FieldOptionProps, FieldOptions, FormAnswer, isGrouped } from '../Form/form.d.tsx';

export interface RadioProps {
  id?: string;
  value: string;
  onChange: (value: FormAnswer) => void;
  options:FieldOptions;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const Radio: React.FC<RadioProps> = ({
  id,
  value,
  onChange,
  options,
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const radioRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);


  const allOptions: FieldOptionProps[] = isGrouped(options)
    ? options.flatMap((group) =>
        group.options.map((option) => ({ ...option, groupName: group.group }))
      )
    : options;

  const groupFirstOptions = isGrouped(options)
    ? options.map((group) => ({ groupName: group.group, firstOpt: group.options[0] }))
    : [];

const allDisplay = allOptions.map((item) => ({
    value: item.value,
    label: item.label,
    group: false,
    groupName: item.groupName
  }));

  groupFirstOptions.forEach((itemWithGroup) =>
    allDisplay.splice(
      allDisplay.findIndex((item) => itemWithGroup.firstOpt?.value === item.value),
      0,
      ({ value: 'group', label: itemWithGroup.groupName, group: true , groupName: itemWithGroup.groupName})
    )
  );

  const selectableIndexes = allDisplay.flatMap((option, index) => option.group ? [] : [index]);

  // Close radio when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (radioRef.current && !radioRef.current.contains(event.target as Node)) {
        // setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(selectableIndexes[0] ?? -1);
        } else if (focusedIndex >= 0) {
          if (!(allDisplay[focusedIndex].group)) {
            handleSelect({
              ...allDisplay[focusedIndex],
              group: allDisplay[focusedIndex].groupName ? allDisplay[focusedIndex].groupName : ''});
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        // setIsOpen(false);
        setFocusedIndex(-1);
        buttonRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => {
          return selectableIndexes.find((index) => index > prev) ?? prev;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => {
          return selectableIndexes.slice().reverse().find((index) => index < prev) ?? prev;
        });
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(selectableIndexes[0] ?? -1);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(selectableIndexes[selectableIndexes.length - 1] ?? -1);
        break;
    }
  };

  // Scroll focused item into view
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.children[focusedIndex] as HTMLElement;
      if (focusedElement && typeof focusedElement.scrollIntoView === 'function') {
        try {
          focusedElement.scrollIntoView({ block: 'nearest' });
        } catch {
          // Ignore scrollIntoView errors in test environments
        }
      }
    }
  }, [focusedIndex, isOpen]);

  const handleSelect = (optionValue: FormAnswer) => {
    if (disabled) return;
    onChange(optionValue);
    setFocusedIndex(-1);
    buttonRef.current?.focus();
  };

  return (
    <div
      className={`custom-radio${className ? ' ' + className : ''}${value ? ' answered' : ''}`}
      ref={radioRef}
    >

      {isOpen && (
        <ul
          ref={listRef}
          className='custom-radio-list'
          role='listbox'
          aria-labelledby={id}
          aria-disabled={disabled}
          onKeyDown={handleKeyDown}
        >
          {allDisplay.map((option, index) => (
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <li
              key={`${option.value}-${index}`}
              className={`custom-radio-option ${
                option.group ? 'group' : `${
                  option.value === value ? 'selected' : ''}`
                } ${
                index === focusedIndex ? 'focused' : ''}`
              }
              role={option.group ? 'presentation' : 'option'}
              aria-selected={option.group ? undefined : option.value === value}
              onClick={option.group ? undefined : () => handleSelect({
                ...option, group: option.groupName ? option.groupName : ''
              })}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Radio;
