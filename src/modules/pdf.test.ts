import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ComplianceProfile, EvaluatedFramework } from '../types/profileResults';
import { downloadProfilePDF } from './pdf';

const pdfCalls = vi.hoisted(() => ({
  addImage: vi.fn(),
  addPage: vi.fn(),
  circle: vi.fn(),
  create: vi.fn(),
  getTextWidth: vi.fn((value: string) => value.length * 5),
  line: vi.fn(),
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
    line = pdfCalls.line;
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
    expect(pdfCalls.splitTextToSize).toHaveBeenCalledWith('Client', 284);
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

  it('records the assessment date and ruleset separately from the PDF generation date', async () => {
    await downloadProfilePDF(makeProfile(null, {
      date: new Date('2026-08-15T12:00:00'),
      rulesetVersion: '2026.08.1',
    }));

    const text = drawnText();
    expect(text).toEqual(expect.arrayContaining([
      'Assessment date', 'August 15, 2026', 'Ruleset version', '2026.08.1',
      'Generated', 'September 28, 2026',
    ]));
    expect(pdfCalls.save).toHaveBeenCalledWith('client-compliance-profile-20260928.pdf');
  });

  it('leaves a clear gap between the longest metadata label and its value', async () => {
    await downloadProfilePDF(makeProfile(null, { date: new Date('2026-08-15T12:00:00') }));

    const label = pdfCalls.text.mock.calls.find(([value]) => value === 'Assessment date');
    const dateValue = pdfCalls.text.mock.calls.find(([value]) => value === 'August 15, 2026');
    expect(label).toBeDefined();
    expect(dateValue).toBeDefined();
    const labelEnd = (label?.[1] as number) + pdfCalls.getTextWidth('Assessment date');
    expect((dateValue?.[1] as number) - labelEnd).toBeGreaterThanOrEqual(12);
  });

  it('identifies missing historical assessment details without substituting current values', async () => {
    await downloadProfilePDF(makeProfile(null));

    const text = drawnText();
    expect(text).toContain('Assessment date');
    expect(text).toContain('Ruleset version');
    expect(text.filter((value) => value === 'Not recorded')).toHaveLength(2);
    expect(text.filter((value) => value === 'September 28, 2026')).toHaveLength(1);
    expect(text).toContain('Questionnaire answers were not recorded for this assessment.');
  });

  it('exports every recorded questionnaire answer with its question, section and meaningful group', async () => {
    await downloadProfilePDF(makeProfile(null, {
      questionnaireAnswers: [{
        sectionTitle: 'Business operations',
        answers: [{
          fieldId: 'regions', fieldLabel: 'Operating regions',
          selectedAnswers: [
            { value: 'ca', label: 'California', group: 'United States' },
            { value: 'eu', label: 'European Union', group: '' },
          ],
        }, {
          fieldId: 'contracts', fieldLabel: 'Contract requirements',
          selectedAnswers: [{ value: 'unknown', label: 'Unknown / needs verification', group: '' }],
        }, {
          fieldId: 'data', fieldLabel: 'Data handled',
          selectedAnswers: [{ value: 'none', label: 'None of the above', group: '' }],
        }, {
          fieldId: 'industry', fieldLabel: 'Industry', selectedAnswers: [],
        }],
      }],
    }));

    expect(drawnText()).toEqual(expect.arrayContaining([
      'Questionnaire answers', 'Business operations', 'Operating regions',
      'United States: California', 'European Union', 'Contract requirements',
      'Unknown / needs verification', 'Data handled', 'None of the above',
      'Industry', 'No answer recorded',
    ]));
  });

  it('keeps a short question and every selected answer together when the remaining page is too short', async () => {
    pdfCalls.splitTextToSize.mockImplementation((value: string) => {
      if (value === 'LONG CATEGORY') return ['LONG', 'CATEGORY'];
      if (value === 'Earlier selected answer') {
        return Array.from({ length: 23 }, (_, index) => `Earlier answer line ${index + 1}`);
      }
      return [value];
    });

    await downloadProfilePDF(makeProfile(null, {
      definite: [{ ...framework, category: 'Long category' }],
      questionnaireAnswers: [{ sectionTitle: 'Business', answers: [{
        fieldId: 'earlier', fieldLabel: 'Earlier question',
        selectedAnswers: [{ value: 'earlier', label: 'Earlier selected answer', group: '' }],
      }, {
        fieldId: 'data_types', fieldLabel: 'Data handled',
        selectedAnswers: [
          { value: 'pci', label: 'Payment card data', group: '' },
          { value: 'employee', label: 'Employee data', group: '' },
        ],
      }] }],
    }));

    const pageNumbers = ['Data handled', 'Payment card data', 'Employee data'].map((text) => {
      const textIndex = pdfCalls.text.mock.calls.findIndex(([value]) => value === text);
      expect(textIndex).toBeGreaterThanOrEqual(0);
      const textOrder = pdfCalls.text.mock.invocationCallOrder[textIndex];
      const precedingPageBreaks = pdfCalls.addPage.mock.invocationCallOrder.filter((order) => order < textOrder);
      return precedingPageBreaks.length;
    });
    expect(pageNumbers).toEqual([1, 1, 1]);
  });

  it('prints reviewer questions after questionnaire answers and preserves separate lines', async () => {
    await downloadProfilePDF(makeProfile(null, {
      questionnaireAnswers: [{ sectionTitle: 'Business', answers: [{
        fieldId: 'industry', fieldLabel: 'Industry',
        selectedAnswers: [{ value: 'software', label: 'Software', group: '' }],
      }] }],
      reviewerQuestions: 'Who approved the scope?\n\nConfirm the contract renewal date.',
    }));

    const text = drawnText();
    expect(text).toContain('Reviewer’s unresolved questions');
    expect(text).toContain('Who approved the scope?');
    expect(text).toContain('Confirm the contract renewal date.');
    expect(text.indexOf('Software')).toBeLessThan(text.indexOf('Reviewer’s unresolved questions'));
    const firstQuestion = pdfCalls.text.mock.calls.find(([value]) => value === 'Who approved the scope?');
    const secondQuestion = pdfCalls.text.mock.calls.find(([value]) => value === 'Confirm the contract renewal date.');
    expect(secondQuestion?.[2]).toBeGreaterThan((firstQuestion?.[2] as number) + 20);
  });

  it('provides ruled writing space when reviewer questions are blank', async () => {
    await downloadProfilePDF(makeProfile(null, { reviewerQuestions: '  \n ' }));

    const titleIndex = pdfCalls.text.mock.calls.findIndex(([value]) => value === 'Reviewer’s unresolved questions');
    expect(titleIndex).toBeGreaterThanOrEqual(0);
    const titleOrder = pdfCalls.text.mock.invocationCallOrder[titleIndex];
    const writingLines = pdfCalls.line.mock.calls.filter(([startX, startY, endX, endY], index) =>
      pdfCalls.line.mock.invocationCallOrder[index] > titleOrder &&
      startX === 56 && endX === 556 && startY === endY && startY < 694
    );
    expect(writingLines).toHaveLength(4);
    expect(writingLines.every(([, y]) => y >= 56 && y <= 736)).toBe(true);
  });

  it.each([
    { answerLineCount: 12, reviewerPage: 1 },
    { answerLineCount: 13, reviewerPage: 2 },
    { answerLineCount: 14, reviewerPage: 2 },
    { answerLineCount: 15, reviewerPage: 2 },
    { answerLineCount: 16, reviewerPage: 2 },
    { answerLineCount: 17, reviewerPage: 2 },
  ])('keeps blank reviewer space and footer together after $answerLineCount answer lines', async ({
    answerLineCount, reviewerPage,
  }) => {
    pdfCalls.splitTextToSize.mockImplementation((value: string) =>
      value === 'Earlier selected answer'
        ? Array.from({ length: answerLineCount }, (_, index) => `Earlier answer line ${index + 1}`)
        : [value]
    );

    await downloadProfilePDF(makeProfile(null, {
      questionnaireAnswers: [{ sectionTitle: 'Business', answers: [{
        fieldId: 'earlier', fieldLabel: 'Earlier question',
        selectedAnswers: [{ value: 'earlier', label: 'Earlier selected answer', group: '' }],
      }] }],
      reviewerQuestions: '',
    }));

    const pageAtCall = (callOrder: number) =>
      1 + pdfCalls.addPage.mock.invocationCallOrder.filter((order) => order < callOrder).length;
    const textCallOrder = (text: string) => {
      const textIndex = pdfCalls.text.mock.calls.findIndex(([value]) => value === text);
      expect(textIndex).toBeGreaterThanOrEqual(0);
      return pdfCalls.text.mock.invocationCallOrder[textIndex];
    };
    const headingOrder = textCallOrder('Reviewer’s unresolved questions');
    const footerOrder = textCallOrder(
      'Educational reference, not legal advice. Confirm applicability with qualified counsel.'
    );
    expect(pageAtCall(textCallOrder(`Earlier answer line ${answerLineCount}`))).toBe(1);
    expect(pageAtCall(headingOrder)).toBe(reviewerPage);
    expect(pageAtCall(footerOrder)).toBe(reviewerPage);

    const writingLines = pdfCalls.line.mock.calls.filter(([, , , endY], index) => {
      const lineOrder = pdfCalls.line.mock.invocationCallOrder[index];
      return lineOrder > headingOrder && lineOrder < footerOrder && endY < 694;
    });
    expect(writingLines).toHaveLength(4);
    for (const line of writingLines) {
      const lineIndex = pdfCalls.line.mock.calls.indexOf(line);
      expect(pageAtCall(pdfCalls.line.mock.invocationCallOrder[lineIndex])).toBe(reviewerPage);
    }
    expect(pdfCalls.addPage).toHaveBeenCalledTimes(reviewerPage - 1);
    expect(pdfCalls.save).toHaveBeenCalledOnce();
    expect(alert).not.toHaveBeenCalled();
  });

  it('wraps long questionnaire answers and reviewer questions across pages within the content area', async () => {
    pdfCalls.splitTextToSize.mockImplementation((value: string) => {
      if (value === 'Long selected answer' || value === 'Long reviewer question') {
        return Array.from({ length: 80 }, (_, index) => `${value} line ${index + 1}`);
      }
      return [value];
    });

    await downloadProfilePDF(makeProfile(null, {
      questionnaireAnswers: [{ sectionTitle: 'Business', answers: [{
        fieldId: 'contracts', fieldLabel: 'Contract requirements',
        selectedAnswers: [{ value: 'contract', label: 'Long selected answer', group: '' }],
      }] }],
      reviewerQuestions: 'Long reviewer question',
    }));

    expect(pdfCalls.addPage.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(drawnText()).toContain('Long selected answer line 80');
    expect(drawnText()).toContain('Long reviewer question line 80');
    const auditLines = pdfCalls.text.mock.calls.filter(([value]) =>
      typeof value === 'string' && value.startsWith('Long ')
    );
    expect(auditLines).toHaveLength(160);
    expect(auditLines.every(([, , y]) => y >= 56 && y <= 736)).toBe(true);
    expect(pdfCalls.save).toHaveBeenCalledOnce();
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
    expect(firstLine?.[1]).toBe(156);
    expect(secondLine?.[1]).toBe(156);
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

  it('exports possible frameworks with exact conditions and no factual applicability reason', async () => {
    await downloadProfilePDF(makeProfile(null, {
      definite: [],
      possible: [{
        ...framework,
        matchLevel: 'possible',
        matchReason: 'Do not present this as a fact',
        first_steps: ['Review the requirements'],
        pendingMatches: [{
          level: 'definite', reason: 'Customer contracts require SOC 2',
          conditions: [{
            fieldId: 'contracts', fieldLabel: 'Contract requirements', expectedLabels: ['SOC 2', 'Both'],
          }],
        }],
      }],
    }));

    expect(drawnText()).toEqual(expect.arrayContaining([
      'Possible - verify unknown answers',
      'Would qualify as Definite if all of these answers are confirmed:',
      'Contract requirements: SOC 2 or Both',
      'Reason if confirmed: Customer contracts require SOC 2',
      'IF CONFIRMED, WHERE TO START',
    ]));
    expect(drawnText()).not.toContain('Do not present this as a fact');
    expect(drawnText()).not.toContain('WHY THIS APPLIES');
    expect(drawnText()).toContain('1 frameworks identified · 1 possible (unconfirmed)');
    expect(pdfCalls.save).toHaveBeenCalledOnce();
  });

  it('keeps known reasons and conditional upgrades distinct in the exported profile', async () => {
    await downloadProfilePDF(makeProfile(null, {
      definite: [],
      consider: [{
        ...framework, matchLevel: 'consider',
        pendingMatches: [{
          level: 'definite', reason: 'Customer contracts require SOC 2',
          conditions: [{ fieldId: 'contracts', fieldLabel: 'Contract requirements', expectedLabels: ['SOC 2'] }],
        }],
      }],
    }));

    expect(drawnText()).toEqual(expect.arrayContaining([
      'Recommended', 'WHY THIS APPLIES', 'Reason',
      'Would qualify as Definite if all of these answers are confirmed:',
      'Reason if confirmed: Customer contracts require SOC 2',
    ]));
    expect(drawnText()).not.toContain('Definitely applies');
  });

  it('exports follow-up questions, actions and assigned owners even without any frameworks', async () => {
    await downloadProfilePDF(makeProfile(null, {
      definite: [],
      followUps: [{
        fieldId: 'contracts', fieldLabel: 'Contract requirements', owner: 'Alex Morgan',
        action: 'Review signed contracts with the account owner.', frameworkIds: [],
      }],
    }));

    expect(drawnText()).toEqual(expect.arrayContaining([
      'Follow-up items', '1. Contract requirements', 'Answer: Unknown', 'Owner: Alex Morgan',
      'Action: Review signed contracts with the account owner.',
      '0 frameworks identified · 1 follow-up item',
    ]));
    expect(drawnText().some((text) => typeof text === 'string' && text.startsWith('Provisional profile:'))).toBe(true);
    expect(pdfCalls.save).toHaveBeenCalledOnce();
    expect(alert).not.toHaveBeenCalled();
  });

  it('identifies affected frameworks and leaves explicitly cleared owners unassigned', async () => {
    await downloadProfilePDF(makeProfile(null, {
      followUps: [{
        fieldId: 'contracts', fieldLabel: 'Contract requirements', owner: ' ',
        action: 'Review signed contracts.', frameworkIds: ['test'],
      }],
    }));

    expect(drawnText()).toContain('May affect: Test framework');
    expect(drawnText()).toContain('Owner: Unassigned');
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
