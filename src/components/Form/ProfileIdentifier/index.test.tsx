// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ProfileIdentifier from './index';

const handleClientNameChange = vi.fn();
const handlePreperNameChange = vi.fn();
const handleLogoImgChange = vi.fn();

const props = {
  clientName: '',
  preperName: '',
  logoImg: null as File | null,
  handleClientNameChange,
  handlePreperNameChange,
  handleLogoImgChange,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ProfileIdentifier', () => {
  it('accepts optional client and preparer names', () => {
    render(<ProfileIdentifier {...props} />);

    fireEvent.change(screen.getByPlaceholderText('Client or organization name'), {
      target: { value: 'Acme' },
    });
    fireEvent.change(screen.getByPlaceholderText('Your firm or MSP name'), {
      target: { value: 'Advisory MSP' },
    });

    expect(handleClientNameChange).toHaveBeenCalledWith('Acme');
    expect(handlePreperNameChange).toHaveBeenCalledWith('Advisory MSP');
  });

  it('opens the file picker, sends the selected logo, previews it, and removes it', async () => {
    const { container, rerender } = render(<ProfileIdentifier {...props} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const picker = vi.spyOn(fileInput, 'click');

    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
    expect(picker).toHaveBeenCalledOnce();

    const logo = new File(['logo'], 'logo.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [logo] } });
    expect(handleLogoImgChange).toHaveBeenCalledWith(logo);

    rerender(<ProfileIdentifier {...props} logoImg={logo} />);
    const preview = await screen.findByRole('img', { name: 'Logo preview' });
    expect(preview.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
    expect(screen.queryByRole('button', { name: 'Upload' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Remove logo' }));
    expect(handleLogoImgChange).toHaveBeenLastCalledWith(null);
    expect(fileInput.value).toBe('');

    rerender(<ProfileIdentifier {...props} logoImg={null} />);
    await waitFor(() => expect(screen.queryByRole('img', { name: 'Logo preview' })).toBeNull());
    expect(screen.getByRole('button', { name: 'Upload' })).toBeTruthy();
  });

  it('hides identity inputs when disabled', () => {
    const { container } = render(<ProfileIdentifier {...props} disabled />);
    expect(container.innerHTML).toBe('');
  });
});
