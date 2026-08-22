import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { Dropdown } from './index';

describe('Dropdown', () => {
  const mockOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  beforeEach(() => {
    // Mock scrollIntoView for jsdom
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders with placeholder when no value is selected', () => {
    const onChange = vi.fn();
    render(
      <Dropdown
        value=""
        onChange={onChange}
        options={mockOptions}
        placeholder="Select an option..."
      />
    );

    expect(screen.getByText('Select an option...')).toBeTruthy();
  });

  it('renders with selected option label when value is provided', () => {
    const onChange = vi.fn();
    render(
      <Dropdown
        value="option2"
        onChange={onChange}
        options={mockOptions}
      />
    );

    expect(screen.getByText('Option 2')).toBeTruthy();
  });

  it('opens dropdown when button is clicked', () => {
    const onChange = vi.fn();
    render(
      <Dropdown
        value=""
        onChange={onChange}
        options={mockOptions}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(screen.getByText('Option 1')).toBeTruthy();
    expect(screen.getByText('Option 2')).toBeTruthy();
    expect(screen.getByText('Option 3')).toBeTruthy();
  });

  it('calls onChange when an option is selected', () => {
    const onChange = vi.fn();
    render(
      <Dropdown
        value=""
        onChange={onChange}
        options={mockOptions}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const option = screen.getByText('Option 2');
    fireEvent.click(option);

    expect(onChange).toHaveBeenCalledWith('option2');
  });

  it('closes dropdown after selecting an option', () => {
    const onChange = vi.fn();
    render(
      <Dropdown
        value=""
        onChange={onChange}
        options={mockOptions}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const option = screen.getByText('Option 1');
    fireEvent.click(option);

    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('supports keyboard navigation with ArrowDown', () => {
    const onChange = vi.fn();
    render(
      <Dropdown
        value=""
        onChange={onChange}
        options={mockOptions}
      />
    );

    const button = screen.getByRole('button');
    button.focus();

    fireEvent.keyDown(button, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeTruthy();
  });

  it('supports keyboard navigation with Enter to select', () => {
    const onChange = vi.fn();
    render(
      <Dropdown
        value=""
        onChange={onChange}
        options={mockOptions}
      />
    );

    const button = screen.getByRole('button');
    button.focus();

    // Open dropdown
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(screen.getByRole('listbox')).toBeTruthy();

    // Select first option
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('option1');
  });

  it('closes dropdown with Escape key', () => {
    const onChange = vi.fn();
    render(
      <Dropdown
        value=""
        onChange={onChange}
        options={mockOptions}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByRole('listbox')).toBeTruthy();

    fireEvent.keyDown(button, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('does not open when disabled', () => {
    const onChange = vi.fn();
    render(
      <Dropdown
        value=""
        onChange={onChange}
        options={mockOptions}
        disabled={true}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('applies answered class when value is selected', () => {
    const onChange = vi.fn();
    const { container } = render(
      <Dropdown
        value="option1"
        onChange={onChange}
        options={mockOptions}
      />
    );

    const dropdown = container.querySelector('.custom-dropdown');
    expect(dropdown?.className).toContain('answered');
  });

  it('closes dropdown when clicking outside', async () => {
    const onChange = vi.fn();
    render(
      <div>
        <Dropdown
          value=""
          onChange={onChange}
          options={mockOptions}
        />
        <div data-testid="outside">Outside</div>
      </div>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByRole('listbox')).toBeTruthy();

    const outside = screen.getByTestId('outside');

    // Use userEvent-like behavior: dispatch native event
    const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true });
    act(() => {
      outside.dispatchEvent(mouseDownEvent);
    });

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).toBeNull();
    }, { timeout: 1000 });
  });
});
