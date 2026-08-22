import React, { useState, useRef, useEffect } from 'react';
import './dropdown.css';
import '../styles.css';
import { FieldOptionProps, FieldOptions, FormAnswer, isGrouped } from '../Form/form.d.tsx';

export interface DropdownProps {
  id?: string;
  value: string;
  onChange: (value: FormAnswer) => void;
  options: FieldOptions;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const allOptions: FieldOptionProps[] = isGrouped(options)
    ? options.flatMap((group) =>
      group.options.map((opt) => ({ ...opt, groupName: group.group }))
    )
    : options.map((opt) => ({ ...opt, groupName: '' }));

  const allDisplay = allOptions.map((item) => ({
    value: item.value,
    label: item.label,
    group: false,
    groupName: item.groupName
  }));

  const selectedOption = allOptions.find(
    (option): option is FieldOptionProps => {
      return option.value === value;
    }
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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
          setFocusedIndex(0);
        } else if (focusedIndex >= 0) {
          if (!(allDisplay[focusedIndex].group)) {
            handleSelect({
              ...allDisplay[focusedIndex],
              group: allDisplay[focusedIndex].groupName ? allDisplay[focusedIndex].groupName : ''
            });
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        buttonRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else {
          setFocusedIndex((prev) => (prev < allOptions.length - 1 ? prev + 1 : prev));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        }
        break;
      case 'Home':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex(0);
        }
        break;
      case 'End':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex(allOptions.length - 1);
        }
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
    onChange(optionValue);
    setIsOpen(false);
    setFocusedIndex(-1);
    buttonRef.current?.focus();
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setFocusedIndex(0);
      }
    }
  };

  return (
    <div
      className={`custom-dropdown ${className} ${value ? 'answered' : ''}`}
      ref={dropdownRef}
    >
      <button
        ref={buttonRef}
        id={id}
        type='button'
        className={`custom-dropdown-button ${isOpen ? 'open' : ''}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-haspopup='listbox'
        aria-expanded={isOpen}
        aria-labelledby={id ? `${id}-label` : undefined}
        disabled={disabled}
      >
        <span className='custom-dropdown-button-text'>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className={`custom-dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          className='custom-dropdown-list'
          role='listbox'
          aria-labelledby={id}
        >
          {allDisplay.map((option, index) => (
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <li
              key={option.group ? `group-${index}` : option.value}
              className={`custom-dropdown-option ${option.group ? 'group' : `${option.value === value ? 'selected' :''}`
                } ${index === focusedIndex ? 'focused' : ''}`
              }
              role='option'
              aria-selected={option.value === value}
              onClick={() => handleSelect({
                ...option, group: option.groupName ? option.groupName : ''
              })}
              onMouseEnter={() => setFocusedIndex(index)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dropdown;
