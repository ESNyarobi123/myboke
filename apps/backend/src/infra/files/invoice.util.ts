import PDFDocument from 'pdfkit';

export type InvoiceTemplate = 'modern' | 'classic' | 'minimal';

export interface InvoicePdfInput {
  businessName: string;
  businessAddress?: string | null;
  businessPhone?: string | null;
  tin?: string | null;
  vatNumber?: string | null;
  number: string;
  status: string;
  issueDate: Date | string;
  dueDate?: Date | string | null;
  customerName: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  items: {
    description: string;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
  }[];
  subtotal: string;
  discount: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  amountPaid: string;
  currency: string;
  notes?: string | null;
  terms?: string | null;
  template?: InvoiceTemplate | string;
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 48;

const PALETTES: Record<
  InvoiceTemplate,
  { ink: string; muted: string; accent: string; soft: string; rule: string }
> = {
  modern: {
    ink: '#0B1220',
    muted: '#6B7688',
    accent: '#0269E9',
    soft: '#EAF1FF',
    rule: '#DCE4F2',
  },
  classic: {
    ink: '#1A1A1A',
    muted: '#5B5B5B',
    accent: '#0B37A1',
    soft: '#F3F4F6',
    rule: '#C9CDD4',
  },
  minimal: {
    ink: '#111111',
    muted: '#8A8A8A',
    accent: '#111111',
    soft: '#FAFAFA',
    rule: '#EAEAEA',
  },
};

function money(currency: string, value: string | number): string {
  const n = Number(value ?? 0);
  return `${currency} ${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function shortDate(value?: Date | string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function qty(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, '');
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

/**
 * PDF ya ankara (A4) — templates tatu zilizoundwa:
 *  · modern  — kichwa cha rangi ya brand, jedwali la mistari laini
 *  · classic — mpangilio wa kiformalia, jedwali lenye fremu
 *  · minimal — nyeupe nyingi, mistari nyembamba
 */
export function invoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  const template: InvoiceTemplate =
    input.template === 'classic' || input.template === 'minimal'
      ? input.template
      : 'modern';

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: M,
      info: {
        Title: `Ankara ${input.number}`,
        Author: input.businessName,
        Subject: 'Invoice',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (template === 'modern') drawModern(doc, input);
    else if (template === 'classic') drawClassic(doc, input);
    else drawMinimal(doc, input);

    drawFooter(doc, input, template);
    doc.end();
  });
}

// ─────────────────────────────────────────────────────────────
// Shared building blocks
// ─────────────────────────────────────────────────────────────

type Doc = PDFKit.PDFDocument;

function table(
  doc: Doc,
  input: InvoicePdfInput,
  top: number,
  opts: {
    headerFill?: string;
    headerText?: string;
    rowRule?: string;
    zebra?: string | null;
    ink: string;
    muted: string;
    cols?: number[];
  },
): number {
  const cols = opts.cols ?? [0, 300, 360, 440, 547.28];
  const headerH = 26;
  let y = top;

  if (opts.headerFill) {
    doc.rect(M, y, PAGE_W - M * 2, headerH).fill(opts.headerFill);
  }
  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor(opts.headerText ?? opts.ink);

  doc.text('MAELEZO', cols[0]! + 6, y + 9, { width: cols[1]! - cols[0]! - 10 });
  doc.text('IDADI', cols[1]!, y + 9, {
    width: cols[2]! - cols[1]!,
    align: 'right',
  });
  doc.text('BEI', cols[2]!, y + 9, {
    width: cols[3]! - cols[2]!,
    align: 'right',
  });
  doc.text('JUMLA', cols[3]!, y + 9, {
    width: cols[4]! - cols[3]! - 6,
    align: 'right',
  });
  y += headerH;

  input.items.forEach((item, index) => {
    const rows = Math.max(
      1,
      Math.ceil(
        doc.heightOfString(item.description, {
          width: cols[1]! - cols[0]! - 12,
        }) / 12,
      ),
    );
    const rowH = Math.max(24, rows * 12 + 12);

    if (opts.zebra && index % 2 === 1) {
      doc.rect(M, y, PAGE_W - M * 2, rowH).fill(opts.zebra);
    }

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(opts.ink)
      .text(item.description, cols[0]! + 6, y + 7, {
        width: cols[1]! - cols[0]! - 12,
      });
    doc.fillColor(opts.muted);
    doc.text(qty(item.quantity), cols[1]!, y + 7, {
      width: cols[2]! - cols[1]!,
      align: 'right',
    });
    doc.text(money(input.currency, item.unitPrice), cols[2]!, y + 7, {
      width: cols[3]! - cols[2]!,
      align: 'right',
    });
    doc
      .fillColor(opts.ink)
      .font('Helvetica-Bold')
      .text(money(input.currency, item.lineTotal), cols[3]!, y + 7, {
        width: cols[4]! - cols[3]! - 6,
        align: 'right',
      });

    if (opts.rowRule) {
      doc
        .moveTo(M, y + rowH)
        .lineTo(PAGE_W - M, y + rowH)
        .strokeColor(opts.rowRule)
        .lineWidth(0.6)
        .stroke();
    }
    y += rowH;
  });

  return y;
}

function totals(
  doc: Doc,
  input: InvoicePdfInput,
  top: number,
  opts: { ink: string; muted: string; accent: string; boxed: boolean },
): number {
  const labelX = 330;
  const valueX = 430;
  const valueW = 117.28;
  let y = top + 10;

  const line = (label: string, value: string, bold = false, color?: string) => {
    doc
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(bold ? 11 : 9)
      .fillColor(color ?? (bold ? opts.ink : opts.muted))
      .text(label, labelX, y, { width: 90, align: 'right' });
    doc
      .fillColor(color ?? opts.ink)
      .text(value, valueX, y, { width: valueW, align: 'right' });
    y += bold ? 20 : 16;
  };

  line('Jumla ndogo', money(input.currency, input.subtotal));
  if (Number(input.discount) > 0) {
    line('Punguzo', `- ${money(input.currency, input.discount)}`);
  }
  if (Number(input.taxAmount) > 0) {
    line(
      `VAT ${Number(input.taxRate).toFixed(0)}%`,
      money(input.currency, input.taxAmount),
    );
  }

  if (opts.boxed) {
    doc.rect(labelX - 12, y + 2, valueW + 84, 30).fill(opts.accent);
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#FFFFFF')
      .text('JUMLA', labelX - 6, y + 11, { width: 90, align: 'right' });
    doc.text(money(input.currency, input.total), valueX, y + 11, {
      width: valueW,
      align: 'right',
    });
    y += 40;
  } else {
    doc
      .moveTo(labelX - 12, y + 4)
      .lineTo(valueX + valueW, y + 4)
      .strokeColor(opts.accent)
      .lineWidth(1)
      .stroke();
    y += 10;
    line('JUMLA', money(input.currency, input.total), true, opts.accent);
  }

  if (Number(input.amountPaid) > 0) {
    line('Iliyolipwa', money(input.currency, input.amountPaid));
    const due = Number(input.total) - Number(input.amountPaid);
    line('Salio', money(input.currency, due), true);
  }

  return y;
}

function drawFooter(doc: Doc, input: InvoicePdfInput, template: InvoiceTemplate) {
  const p = PALETTES[template];
  const notes = [input.notes, input.terms].filter(Boolean).join('\n');
  if (notes) {
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(p.muted)
      .text(notes, M, PAGE_H - 130, { width: PAGE_W - M * 2, lineGap: 2 });
  }
  doc
    .font('Helvetica')
    .fontSize(7)
    .fillColor(p.muted)
    .text(
      `${input.businessName} · Ankara ${input.number} · Imetengenezwa na MyBoke`,
      M,
      PAGE_H - 60,
      { width: PAGE_W - M * 2, align: 'center' },
    );
}

function stamp(doc: Doc, input: InvoicePdfInput, x: number, y: number) {
  const paid = input.status === 'PAID';
  const label = paid ? 'IMELIPWA' : input.status === 'OVERDUE' ? 'IMECHELEWA' : null;
  if (!label) return;
  const color = paid ? '#16A760' : '#DC2626';
  doc
    .save()
    .rotate(-12, { origin: [x, y] })
    .lineWidth(2)
    .strokeColor(color)
    .roundedRect(x - 62, y - 16, 124, 32, 6)
    .stroke()
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor(color)
    .text(label, x - 62, y - 5, { width: 124, align: 'center' })
    .restore();
}

// ─────────────────────────────────────────────────────────────
// Template 1 — MODERN (brand band + soft table)
// ─────────────────────────────────────────────────────────────

function drawModern(doc: Doc, input: InvoicePdfInput) {
  const p = PALETTES.modern;

  doc.rect(0, 0, PAGE_W, 132).fill(p.accent);
  doc.rect(0, 120, PAGE_W, 12).fill('#73D31C');

  // Logo badge
  doc.circle(M + 20, 52, 20).fill('#FFFFFF');
  doc
    .font('Helvetica-Bold')
    .fontSize(14)
    .fillColor(p.accent)
    .text(initials(input.businessName), M + 2, 45, { width: 36, align: 'center' });

  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .fillColor('#FFFFFF')
    .text(input.businessName, M + 52, 34, { width: 260 });
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#D6E6FF')
    .text(
      [input.businessPhone, input.businessAddress].filter(Boolean).join(' · ') ||
        'Dar es Salaam, Tanzania',
      M + 52,
      56,
      { width: 280 },
    );
  if (input.tin || input.vatNumber) {
    doc.text(
      [input.tin && `TIN ${input.tin}`, input.vatNumber && `VAT ${input.vatNumber}`]
        .filter(Boolean)
        .join(' · '),
      M + 52,
      70,
      { width: 280 },
    );
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(30)
    .fillColor('#FFFFFF')
    .text('ANKARA', PAGE_W - M - 200, 30, { width: 200, align: 'right' });
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#D6E6FF')
    .text(input.number, PAGE_W - M - 200, 66, {
      width: 200,
      align: 'right',
    });

  let y = 170;

  doc.font('Helvetica-Bold').fontSize(8).fillColor(p.muted).text('MTEJA', M, y);
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(p.ink)
    .text(input.customerName, M, y + 14, { width: 240 });
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(p.muted)
    .text(
      [input.customerPhone, input.customerAddress].filter(Boolean).join('\n') || '—',
      M,
      y + 30,
      { width: 240, lineGap: 2 },
    );

  const metaX = 340;
  const meta = [
    ['Tarehe', shortDate(input.issueDate)],
    ['Malipo', shortDate(input.dueDate)],
    ['Hali', input.status],
  ];
  meta.forEach(([label, value], i) => {
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(p.muted)
      .text(label!, metaX, y + i * 16, { width: 80 });
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(p.ink)
      .text(value!, metaX + 86, y + i * 16, { width: 130, align: 'right' });
  });

  y += 96;
  y = table(doc, input, y, {
    headerFill: p.soft,
    headerText: p.accent,
    rowRule: p.rule,
    ink: p.ink,
    muted: p.muted,
  });

  totals(doc, input, y, { ink: p.ink, muted: p.muted, accent: p.accent, boxed: true });
  stamp(doc, input, 470, 200);
}

// ─────────────────────────────────────────────────────────────
// Template 2 — CLASSIC (formal, framed table)
// ─────────────────────────────────────────────────────────────

function drawClassic(doc: Doc, input: InvoicePdfInput) {
  const p = PALETTES.classic;

  doc
    .rect(M, M, PAGE_W - M * 2, 2)
    .fill(p.accent);

  doc
    .font('Times-Bold')
    .fontSize(20)
    .fillColor(p.ink)
    .text(input.businessName, M, M + 20, { width: 300 });
  doc
    .font('Times-Roman')
    .fontSize(8.5)
    .fillColor(p.muted)
    .text(
      [input.businessPhone, input.businessAddress, input.tin && `TIN ${input.tin}`]
        .filter(Boolean)
        .join('  |  ') || 'Dar es Salaam, Tanzania',
      M,
      M + 46,
      { width: 300 },
    );

  doc
    .font('Times-Bold')
    .fontSize(18)
    .fillColor(p.accent)
    .text('ANKARA', PAGE_W - M - 200, M + 20, { width: 200, align: 'right' });
  doc
    .font('Times-Roman')
    .fontSize(9)
    .fillColor(p.ink)
    .text(input.number, PAGE_W - M - 200, M + 44, {
      width: 200,
      align: 'right',
    });
  doc
    .fontSize(8)
    .fillColor(p.muted)
    .text(shortDate(input.issueDate), PAGE_W - M - 200, M + 58, {
      width: 200,
      align: 'right',
    });

  let y = M + 92;
  doc
    .moveTo(M, y)
    .lineTo(PAGE_W - M, y)
    .strokeColor(p.rule)
    .lineWidth(1)
    .stroke();

  y += 18;
  doc
    .font('Times-Bold')
    .fontSize(8)
    .fillColor(p.muted)
    .text('ANWANI YA MTEJA', M, y);
  doc
    .font('Times-Bold')
    .fontSize(11)
    .fillColor(p.ink)
    .text(input.customerName, M, y + 14, { width: 260 });
  doc
    .font('Times-Roman')
    .fontSize(8.5)
    .fillColor(p.muted)
    .text(
      [input.customerPhone, input.customerAddress].filter(Boolean).join('\n') || '—',
      M,
      y + 30,
      { width: 260, lineGap: 2 },
    );

  doc
    .font('Times-Bold')
    .fontSize(8)
    .fillColor(p.muted)
    .text('TAREHE YA MALIPO', 380, y, { width: 167.28, align: 'right' });
  doc
    .font('Times-Roman')
    .fontSize(10)
    .fillColor(p.ink)
    .text(shortDate(input.dueDate), 380, y + 14, {
      width: 167.28,
      align: 'right',
    });

  y += 86;
  y = table(doc, input, y, {
    headerFill: p.soft,
    headerText: p.ink,
    rowRule: p.rule,
    ink: p.ink,
    muted: p.muted,
  });

  doc
    .rect(M, y, PAGE_W - M * 2, 0.8)
    .fill(p.rule);

  totals(doc, input, y, { ink: p.ink, muted: p.muted, accent: p.accent, boxed: true });
  stamp(doc, input, 470, 210);
}

// ─────────────────────────────────────────────────────────────
// Template 3 — MINIMAL
// ─────────────────────────────────────────────────────────────

function drawMinimal(doc: Doc, input: InvoicePdfInput) {
  const p = PALETTES.minimal;

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(p.ink)
    .text(input.businessName.toUpperCase(), M, M, { width: 300, characterSpacing: 2 });

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(p.muted)
    .text(
      [input.businessPhone, input.businessAddress].filter(Boolean).join('\n') || '—',
      M,
      M + 20,
      { width: 240, lineGap: 2 },
    );

  doc
    .font('Helvetica-Bold')
    .fontSize(34)
    .fillColor(p.ink)
    .text('Ankara', PAGE_W - M - 200, M - 6, { width: 200, align: 'right' });
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(p.muted)
    .text(input.number, PAGE_W - M - 200, M + 34, {
      width: 200,
      align: 'right',
    });

  let y = M + 90;
  doc
    .moveTo(M, y)
    .lineTo(PAGE_W - M, y)
    .strokeColor(p.ink)
    .lineWidth(0.8)
    .stroke();

  y += 16;
  const blocks = [
    ['KWA', input.customerName, [input.customerPhone, input.customerAddress].filter(Boolean).join('\n')],
    ['TAREHE', shortDate(input.issueDate), ''],
    ['MALIPO', shortDate(input.dueDate), ''],
  ];
  let bx = M;
  blocks.forEach(([label, value, sub], i) => {
    const w = i === 0 ? 220 : 130;
    doc.font('Helvetica').fontSize(7).fillColor(p.muted).text(label!, bx, y, { width: w });
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(p.ink).text(value!, bx, y + 12, { width: w });
    if (sub) {
      doc.font('Helvetica').fontSize(7.5).fillColor(p.muted).text(sub, bx, y + 26, { width: w });
    }
    bx += w + 20;
  });

  y += 62;
  y = table(doc, input, y, {
    headerFill: null as unknown as string,
    headerText: p.muted,
    rowRule: p.rule,
    ink: p.ink,
    muted: p.muted,
  });

  doc
    .moveTo(M, y)
    .lineTo(PAGE_W - M, y)
    .strokeColor(p.ink)
    .lineWidth(0.8)
    .stroke();

  totals(doc, input, y, { ink: p.ink, muted: p.muted, accent: p.ink, boxed: false });
  stamp(doc, input, 480, 240);
}
