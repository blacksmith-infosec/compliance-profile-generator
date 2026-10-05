import React, { useState, useRef, useEffect } from 'react';
import './checkbox.css';
import '../styles.css';
import { FieldOptionProps, FieldOptions, FormAnswer, isGrouped } from '../Form/form.d.tsx';

export interface CheckboxProps {
  id?: string;
  values: string[];
  onChange: (value: FormAnswer) => void;
  options:FieldOptions;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  id,
  values,
  onChange,
  options,
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const checkboxRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const allOptions: FieldOptionProps[] = isGrouped(options)
    ? options.flatMap((group) =>
        group.options.map((opt) => ({ ...opt, groupName: group.group }))
      )
    : options.map((opt) => ({ ...opt, groupName: '' }));

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

  // Close checkbox when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (checkboxRef.current && !checkboxRef.current.contains(event.target as Node)) {
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
          const focused = allDisplay[focusedIndex];
          if (!(focused.group)) {
            handleSelect({
              value: focused.value,
              label: focused.label,
              group: focused.groupName ? focused.groupName : ''
            });
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
      className={`custom-checkbox ${className}${values.length > 0 ? ' answered' : ''}`}
      ref={checkboxRef}
    >

      {isOpen && (
        <ul
          ref={listRef}
          className={'custom-checkbox-list'}
          role='listbox'
          aria-labelledby={id}
          aria-disabled={disabled}
          onKeyDown={handleKeyDown}
        >
          {allDisplay.map((option, index) => (
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <li
              key={`${option.value}-${index}`}
              className={`custom-checkbox-option${
                option.group ? ' group' : `${
                  values.includes(option.value) ? ' selected' : ''}`
                }${
                index === focusedIndex ? ' focused' : ''}`
              }
              role={option.group ? 'presentation' : 'option'}
              aria-selected={option.group ? undefined : values.includes(option.value)}
              onClick={option.group ? undefined : () => handleSelect({
                value: option.value,
                label: option.label,
                group: option.groupName ? option.groupName : ''})}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Checkbox;
