import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ComplianceProfile, EvaluatedFramework } from '../types/profileResults';
import { downloadProfilePDF } from './pdf';

const pdfCalls = vi.hoisted(() => ({
  addImage: vi.fn(),
  save: vi.fn(),
  splitTextToSize: vi.fn((value: string) => [value]),
}));

vi.mock('jspdf', () => ({
  jsPDF: class {
    addImage = pdfCalls.addImage;
    save = pdfCalls.save;
    setFont = () => {};
    setFontSize = () => {};
    setTextColor = () => {};
    setFillColor = () => {};
    setDrawColor = () => {};
    setLineWidth = () => {};
    text = () => {};
    line = () => {};
    circle = () => {};
    link = () => {};
    addPage = () => {};
    splitTextToSize = pdfCalls.splitTextToSize;
    getTextWidth = (text: string) => text.length * 5;
  }
}));

const framework = {
  id: 'test',
  name: 'Test framework',
  category: 'Test',
  description: 'Description',
  reference_url: '',
  evaluators: [],
  first_steps: [],
  matchLevel: 'definite',
  matchReason: 'Reason'
} satisfies EvaluatedFramework;

const makeProfile = (logoImg: File | null): ComplianceProfile => ({
  definite: [framework],
  likely: [],
  consider: [],
  identity: { clientName: 'Client', preperName: 'Prepared by', logoImg }
});

describe('downloadProfilePDF', () => {
  const drawImage = vi.fn();
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage }),
    toDataURL: () => 'data:image/png;base64,encoded-logo'
  };
  const alert = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    canvas.width = 0;
    canvas.height = 0;

    vi.stubGlobal('alert', alert);
    vi.stubGlobal('document', { createElement: () => canvas });
    vi.stubGlobal('FileReader', class {
      result: string | null = null;
      onload: (() => void) | null = null;
      readAsDataURL(file: File) {
        this.result = `data:${file.type};base64,${file.name}`;
        this.onload?.();
      }
    });
    vi.stubGlobal('Image', class {
      naturalWidth = 800;
      naturalHeight = 200;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(value: string) {
        if (value.includes('invalid')) this.onerror?.();
        else this.onload?.();
      }
    });
  });

  it('embeds an uploaded SVG as a PNG with its aspect ratio preserved', async () => {
    const logo = new File(['<svg/>'], 'client.svg', { type: 'image/svg+xml' });

    await downloadProfilePDF(makeProfile(logo));

    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 512, 128);
    expect(pdfCalls.addImage).toHaveBeenCalledWith(
      'data:image/png;base64,encoded-logo', 'PNG', 460, 56, 96, 24
    );
    expect(pdfCalls.splitTextToSize).toHaveBeenCalledWith('Client', 304);
    expect(pdfCalls.save).toHaveBeenCalledOnce();
    expect(alert).not.toHaveBeenCalled();
  });

  it('downloads a PDF without a logo when none was uploaded', async () => {
    await downloadProfilePDF(makeProfile(null));

    expect(pdfCalls.addImage).not.toHaveBeenCalled();
    expect(pdfCalls.save).toHaveBeenCalledOnce();
  });

  it('reports an invalid logo instead of downloading a PDF without it', async () => {
    const logo = new File(['invalid'], 'invalid.png', { type: 'image/png' });

    await downloadProfilePDF(makeProfile(logo));

    expect(alert).toHaveBeenCalledWith(
      'Could not process the uploaded logo. Please choose a different image and try again.'
    );
    expect(pdfCalls.save).not.toHaveBeenCalled();
  });
});
