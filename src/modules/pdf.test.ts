import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ComplianceProfile, EvaluatedFramework } from '../types/profileResults';
import { downloadProfilePDF } from './pdf';

const pdfCalls = vi.hoisted(() => ({
  addImage: vi.fn(),
  addPage: vi.fn(),
  circle: vi.fn(),
  create: vi.fn(),
  getTextWidth: vi.fn((value: string) => value.length * 5),
  link: vi.fn(),
  save: vi.fn(),
  splitTextToSize: vi.fn((value: string) => [value]),
  text: vi.fn(),
}));

vi.mock('jspdf', () => ({
  jsPDF: class {
    constructor(options: unknown) { pdfCalls.create(options); }
    addImage = pdfCalls.addImage;
    save = pdfCalls.save;
    setFont = () => {};
    setFontSize = () => {};
    setTextColor = () => {};
    setFillColor = () => {};
    setDrawColor = () => {};
    setLineWidth = () => {};
    text = pdfCalls.text;
    line = () => {};
    circle = pdfCalls.circle;
    link = pdfCalls.link;
    addPage = pdfCalls.addPage;
    splitTextToSize = pdfCalls.splitTextToSize;
    getTextWidth = pdfCalls.getTextWidth;
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

const makeProfile = (logoImg: File | null, overrides: Partial<ComplianceProfile> = {}): ComplianceProfile => ({
  definite: [framework],
  likely: [],
  consider: [],
  identity: { clientName: 'Client', preperName: 'Prepared by', logoImg },
  ...overrides,
});

const drawnText = () => pdfCalls.text.mock.calls.map(([value]) => value);

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
    vi.resetAllMocks();
    pdfCalls.getTextWidth.mockImplementation((value: string) => value.length * 5);
    pdfCalls.splitTextToSize.mockImplementation((value: string) => [value]);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-28T12:00:00'));
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

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
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
    expect(pdfCalls.create).toHaveBeenCalledWith({ unit: 'pt', format: 'letter' });
    expect(pdfCalls.save).toHaveBeenCalledOnce();
  });

  it('renders all three tiers in order with accurate counts and identity details', async () => {
    const likely = { ...framework, id: 'likely', name: 'Likely framework', matchLevel: 'likely' as const };
    const consider = { ...framework, id: 'consider', name: 'Recommended framework', matchLevel: 'consider' as const };
    const definite = { ...framework, id: 'definite', name: 'Definite framework' };
    // The report uses each framework's match level, even if the input buckets differ.
    const profile = makeProfile(null, {
      definite: [consider], likely: [definite], consider: [likely]
    });

    await downloadProfilePDF(profile);

    const text = drawnText();
    expect(text).toContain('Compliance Profile Report');
    expect(text).toContain('Client');
    expect(text).toContain('Prepared by');
    expect(text).toContain('September 28, 2026');
    expect(text).toContain('3 frameworks identified · 1 definitely apply · 1 likely apply · 1 recommended');
    expect(text.indexOf('Definitely applies')).toBeLessThan(text.indexOf('Likely applies'));
    expect(text.indexOf('Likely applies')).toBeLessThan(text.indexOf('Recommended'));
    expect(text.indexOf('Definite framework')).toBeLessThan(text.indexOf('Likely framework'));
    expect(text.indexOf('Likely framework')).toBeLessThan(text.indexOf('Recommended framework'));
    expect(pdfCalls.circle).toHaveBeenCalledTimes(3);
    expect(pdfCalls.save).toHaveBeenCalledWith('client-compliance-profile-20260928.pdf');
  });

  it('includes framework details, numbered first steps, and a clickable reference', async () => {
    const detailed = {
      ...framework,
      category: 'Healthcare',
      description: 'Protect patient records',
      matchReason: 'Handles health data',
      reference_url: 'https://example.com/framework',
      first_steps: ['Find the data', 'Set access controls'],
    };

    await downloadProfilePDF(makeProfile(null, { definite: [detailed] }));

    expect(drawnText()).toEqual(expect.arrayContaining([
      'Test framework', 'HEALTHCARE', 'Protect patient records',
      'WHY THIS APPLIES', 'Handles health data', 'WHERE TO START',
      '1.', 'Find the data', '2.', 'Set access controls', 'REFERENCE',
    ]));
    expect(pdfCalls.link).toHaveBeenCalledWith(
      expect.any(Number), expect.any(Number), expect.any(Number), 11,
      { url: 'https://example.com/framework' }
    );
    expect(drawnText()).toContain(
      'Educational reference, not legal advice. Confirm applicability with qualified counsel.'
    );
  });

  it('places a reference on the next line when it would exceed the card width', async () => {
    const category = 'C'.repeat(81);
    pdfCalls.getTextWidth.mockImplementation((value: string) =>
      value === 'REFERENCE' ? 70 : value.length * 5
    );

    await downloadProfilePDF(makeProfile(null, {
      definite: [{ ...framework, category, reference_url: 'https://example.com/wide' }]
    }));

    const categoryCall = pdfCalls.text.mock.calls.find(([value]) => value === category);
    const referenceCall = pdfCalls.text.mock.calls.find(([value]) => value === 'REFERENCE');
    expect(referenceCall?.[1]).toBe(66);
    expect(referenceCall?.[2]).toBeGreaterThan(categoryCall?.[2] as number);
    expect(pdfCalls.link).toHaveBeenCalledWith(65, expect.any(Number), 72, 11, {
      url: 'https://example.com/wide',
    });
  });

  it('renders each line of a wrapped identity value', async () => {
    pdfCalls.splitTextToSize.mockImplementation((value: string) =>
      value === 'Long client name' ? ['Long client', 'name'] : [value]
    );

    await downloadProfilePDF(makeProfile(null, {
      identity: { clientName: 'Long client name', preperName: 'Consultant', logoImg: null }
    }));

    const firstLine = pdfCalls.text.mock.calls.find(([value]) => value === 'Long client');
    const secondLine = pdfCalls.text.mock.calls.find(([value]) => value === 'name');
    expect(firstLine?.[1]).toBe(136);
    expect(secondLine?.[1]).toBe(136);
    expect(secondLine?.[2]).toBeGreaterThan(firstLine?.[2] as number);
  });

  it('omits an empty reference and first-steps section', async () => {
    await downloadProfilePDF(makeProfile(null));

    expect(pdfCalls.link).not.toHaveBeenCalled();
    expect(drawnText()).not.toContain('WHERE TO START');
    expect(drawnText()).not.toContain('REFERENCE');
  });

  it('wraps a long reason with a single bullet marker', async () => {
    pdfCalls.splitTextToSize.mockImplementation((value: string) =>
      value === 'Long reason' ? ['First reason line', 'Second reason line'] : [value]
    );

    await downloadProfilePDF(makeProfile(null, {
      definite: [{ ...framework, matchReason: 'Long reason' }]
    }));

    expect(drawnText().filter((value) => value === '•')).toHaveLength(1);
    const firstLine = pdfCalls.text.mock.calls.find(([value]) => value === 'First reason line');
    const secondLine = pdfCalls.text.mock.calls.find(([value]) => value === 'Second reason line');
    expect(secondLine?.[1]).toBe(firstLine?.[1]);
    expect(secondLine?.[2]).toBeGreaterThan(firstLine?.[2] as number);
  });

  it('starts a short framework card on a new page when it will not fit', async () => {
    const frameworks = Array.from({ length: 6 }, (_, index) => ({
      ...framework, id: String(index), name: `Framework ${index + 1}`,
    }));

    await downloadProfilePDF(makeProfile(null, { definite: frameworks }));

    expect(pdfCalls.addPage).toHaveBeenCalled();
    const pageBreak = pdfCalls.addPage.mock.invocationCallOrder[0];
    const sixthName = pdfCalls.text.mock.calls.findIndex(([value]) => value === 'Framework 6');
    expect(sixthName).toBeGreaterThanOrEqual(0);
    expect(pageBreak).toBeLessThan(pdfCalls.text.mock.invocationCallOrder[sixthName]);
    expect(pdfCalls.text.mock.calls[sixthName][2]).toBe(66);
  });

  it('moves the footer to a new page when the last card reaches it', async () => {
    const frameworks = Array.from({ length: 5 }, (_, index) => ({
      ...framework, id: String(index), name: `Framework ${index + 1}`,
    }));

    await downloadProfilePDF(makeProfile(null, { definite: frameworks }));

    const lastName = pdfCalls.text.mock.calls.findIndex(([value]) => value === 'Framework 5');
    expect(pdfCalls.addPage).toHaveBeenCalledOnce();
    expect(pdfCalls.addPage.mock.invocationCallOrder[0]).toBeGreaterThan(
      pdfCalls.text.mock.invocationCallOrder[lastName]
    );
    expect(drawnText()).toContain(
      'Educational reference, not legal advice. Confirm applicability with qualified counsel.'
    );
  });

  it('continues an unusually long description across pages', async () => {
    pdfCalls.splitTextToSize.mockImplementation((value: string) =>
      value === 'Long description'
        ? Array.from({ length: 80 }, (_, index) => `Description line ${index + 1}`)
        : [value]
    );

    await downloadProfilePDF(makeProfile(null, {
      definite: [{ ...framework, description: 'Long description' }]
    }));

    expect(pdfCalls.addPage).toHaveBeenCalled();
    expect(drawnText()).toContain('Description line 80');
    expect(pdfCalls.save).toHaveBeenCalledOnce();
  });

  it('uses a safe fallback filename and metadata when names are missing', async () => {
    await downloadProfilePDF(makeProfile(null, {
      identity: { clientName: '', preperName: '', logoImg: null }
    }));

    expect(drawnText().filter((value) => value === 'Not specified')).toHaveLength(2);
    expect(pdfCalls.save).toHaveBeenCalledWith('compliance-profile-compliance-profile-20260928.pdf');
  });

  it('sanitizes and limits the client name in the filename', async () => {
    const longName = `Acme & Sons / ${'A'.repeat(80)}`;

    await downloadProfilePDF(makeProfile(null, {
      identity: { clientName: longName, preperName: 'Consultant', logoImg: null }
    }));

    const filename = pdfCalls.save.mock.calls[0][0] as string;
    expect(filename).toMatch(/^acme-sons-a+-compliance-profile-20260928\.pdf$/);
    expect(filename.split('-compliance-profile-')[0]).toHaveLength(60);
  });

  it('uses the default filename stem when a client name has no letters or digits', async () => {
    await downloadProfilePDF(makeProfile(null, {
      identity: { clientName: '!!!', preperName: 'Consultant', logoImg: null }
    }));

    expect(pdfCalls.save).toHaveBeenCalledWith('compliance-profile-compliance-profile-20260928.pdf');
  });

  it('asks for a profile before downloading when every tier is empty', async () => {
    await downloadProfilePDF(makeProfile(null, { definite: [], likely: [], consider: [] }));

    expect(alert).toHaveBeenCalledWith('Generate a profile first, then download the PDF.');
    expect(pdfCalls.create).not.toHaveBeenCalled();
    expect(pdfCalls.save).not.toHaveBeenCalled();
  });

  it('reports an invalid logo instead of downloading a PDF without it', async () => {
    const logo = new File(['invalid'], 'invalid.png', { type: 'image/png' });

    await downloadProfilePDF(makeProfile(logo));

    expect(alert).toHaveBeenCalledWith(
      'Could not process the uploaded logo. Please choose a different image and try again.'
    );
    expect(pdfCalls.save).not.toHaveBeenCalled();
  });

  it('resizes portrait logos while preserving their aspect ratio', async () => {
    vi.stubGlobal('Image', class {
      naturalWidth = 200;
      naturalHeight = 800;
      onload: (() => void) | null = null;
      set src(_value: string) { this.onload?.(); }
    });

    await downloadProfilePDF(makeProfile(new File(['portrait'], 'portrait.png', { type: 'image/png' })));

    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 128, 512);
    expect(pdfCalls.addImage).toHaveBeenCalledWith(
      'data:image/png;base64,encoded-logo', 'PNG', 532, 56, 24, 96
    );
  });

  it('keeps small logos at their native canvas dimensions', async () => {
    vi.stubGlobal('Image', class {
      naturalWidth = 40;
      naturalHeight = 20;
      onload: (() => void) | null = null;
      set src(_value: string) { this.onload?.(); }
    });

    await downloadProfilePDF(makeProfile(new File(['small'], 'small.png', { type: 'image/png' })));

    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 40, 20);
    expect(pdfCalls.addImage).toHaveBeenCalledOnce();
  });

  it('rejects files that cannot be read as image data', async () => {
    vi.stubGlobal('FileReader', class {
      onerror: (() => void) | null = null;
      readAsDataURL() { this.onerror?.(); }
    });

    await downloadProfilePDF(makeProfile(new File(['bad'], 'bad.png')));

    expect(alert).toHaveBeenCalledWith(
      'Could not process the uploaded logo. Please choose a different image and try again.'
    );
    expect(pdfCalls.create).not.toHaveBeenCalled();
  });

  it('rejects a file reader result that is not an image data URL', async () => {
    vi.stubGlobal('FileReader', class {
      result = new ArrayBuffer(4);
      onload: (() => void) | null = null;
      readAsDataURL() { this.onload?.(); }
    });

    await downloadProfilePDF(makeProfile(new File(['bad'], 'bad.png')));

    expect(alert).toHaveBeenCalledWith(
      'Could not process the uploaded logo. Please choose a different image and try again.'
    );
    expect(pdfCalls.create).not.toHaveBeenCalled();
  });

  it('rejects logos with no dimensions or no canvas context', async () => {
    vi.stubGlobal('Image', class {
      naturalWidth = 0;
      naturalHeight = 0;
      onload: (() => void) | null = null;
      set src(_value: string) { this.onload?.(); }
    });

    await downloadProfilePDF(makeProfile(new File(['empty'], 'empty.png')));
    expect(alert).toHaveBeenCalledOnce();
    expect(pdfCalls.create).not.toHaveBeenCalled();

    vi.clearAllMocks();
    vi.stubGlobal('Image', class {
      naturalWidth = 20;
      naturalHeight = 20;
      onload: (() => void) | null = null;
      set src(_value: string) { this.onload?.(); }
    });
    vi.stubGlobal('document', { createElement: () => ({ ...canvas, getContext: () => null }) });

    await downloadProfilePDF(makeProfile(new File(['bad-canvas'], 'bad-canvas.png')));
    expect(alert).toHaveBeenCalledOnce();
    expect(pdfCalls.create).not.toHaveBeenCalled();
  });

  it('reports generation failures without saving a broken PDF', async () => {
    pdfCalls.save.mockImplementationOnce(() => { throw new Error('Disk unavailable'); });

    await downloadProfilePDF(makeProfile(null));

    expect(alert).toHaveBeenCalledWith('PDF generation failed.');
  });
});
