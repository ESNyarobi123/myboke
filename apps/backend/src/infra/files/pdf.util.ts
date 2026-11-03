import PDFDocument from 'pdfkit';

export interface ReceiptPdfInput {
  businessName: string;
  shopName: string;
  address?: string | null;
  phone?: string | null;
  tin?: string | null;
  vatNumber?: string | null;
  receiptNo: string;
  saleDate: Date | string;
  cashier?: string | null;
  customer?: string | null;
  currency: string;
  items: { name: string; quantity: string; price: string; lineTotal: string }[];
  subtotal: string;
  discount: string;
  total: string;
  vat?: { rate: string | number; net: string; vat: string } | null;
  payments: { method: string; amount: string; reference?: string | null }[];
  efd?: { receiptNo?: string | null; verificationCode?: string | null } | null;
  /** D19 — QR ya risiti (data URL base64 PNG). */
  qrDataUrl?: string | null;
  footer?: string;
  widthMm?: 58 | 80;
}

const MM_TO_PT = 2.834645669;

function money(currency: string, value: string): string {
  const n = Number(value);
  const formatted = n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
}

/** Hutengeneza PDF ya risiti ya thermal (58mm au 80mm). */
export function receiptPdf(input: ReceiptPdfInput): Promise<Buffer> {
  const widthMm = input.widthMm ?? 80;
  const width = widthMm * MM_TO_PT;
  const margin = 8;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [width, 600],
      margin,
      autoFirstPage: true,
      info: { Title: `Risiti ${input.receiptNo}`, Author: input.businessName },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const inner = width - margin * 2;
    const center = (text: string, size = 9, bold = false) => {
      doc
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(size)
        .text(text, margin, doc.y, { width: inner, align: 'center' });
    };
    const line = () => {
      doc
        .moveTo(margin, doc.y + 2)
        .lineTo(width - margin, doc.y + 2)
        .dash(2, { space: 2 })
        .strokeColor('#999999')
        .stroke()
        .undash();
      doc.moveDown(0.6);
    };
    const row = (left: string, right: string, bold = false) => {
      const y = doc.y;
      doc
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(8)
        .text(left, margin, y, { width: inner * 0.62 });
      doc
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(8)
        .text(right, margin + inner * 0.6, y, {
          width: inner * 0.4,
          align: 'right',
        });
      doc.moveDown(0.25);
    };

    center(input.businessName.toUpperCase(), 11, true);
    if (input.shopName) center(input.shopName, 8);
    if (input.address) center(input.address, 7);
    if (input.phone) center(`Simu: ${input.phone}`, 7);
    if (input.tin) center(`TIN: ${input.tin}`, 7);
    if (input.vatNumber) center(`VAT No: ${input.vatNumber}`, 7);
    doc.moveDown(0.4);
    line();

    row('Risiti No', input.receiptNo, true);
    const date = new Date(input.saleDate);
    row(
      'Tarehe',
      `${date.toLocaleDateString('en-GB')} ${date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
    );
    if (input.cashier) row('Muuzaji', input.cashier);
    if (input.customer) row('Mteja', input.customer);
    line();

    for (const item of input.items) {
      doc
        .font('Helvetica')
        .fontSize(8)
        .text(item.name, margin, doc.y, { width: inner });
      row(
        `  ${item.quantity} x ${Number(item.price).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        money(input.currency, item.lineTotal),
      );
    }

    line();
    row('Jumla ndogo', money(input.currency, input.subtotal));
    if (Number(input.discount) > 0) {
      row('Punguzo', `-${money(input.currency, input.discount)}`);
    }
    if (input.vat) {
      row(`Net (VAT ${input.vat.rate}%)`, money(input.currency, input.vat.net));
      row(`VAT ${input.vat.rate}%`, money(input.currency, input.vat.vat));
    }
    row('JUMLA', money(input.currency, input.total), true);
    line();

    for (const p of input.payments) {
      row(`Malipo: ${p.method}`, money(input.currency, p.amount));
    }

    if (input.efd?.receiptNo || input.efd?.verificationCode) {
      line();
      if (input.efd.receiptNo) row('EFD Risiti', input.efd.receiptNo);
      if (input.efd.verificationCode) {
        doc
          .font('Helvetica')
          .fontSize(7)
          .text(`Verification: ${input.efd.verificationCode}`, margin, doc.y, {
            width: inner,
          });
      }
    }

    // D19 — QR ya risiti (uthibitisho wa haraka).
    if (input.qrDataUrl) {
      try {
        const base64 = input.qrDataUrl.split(',')[1] ?? '';
        const qr = Buffer.from(base64, 'base64');
        const size = widthMm === 58 ? 72 : 88;
        doc.moveDown(0.4);
        doc.image(qr, margin + (inner - size) / 2, doc.y, {
          width: size,
          height: size,
        });
        doc.y += size - 8;
        center('Scan kuthibitisha risiti', 6);
      } catch {
        /* QR ni ya hiari — isizuie risiti */
      }
    }

    doc.moveDown(0.6);
    center('Asante kwa kununua!', 9, true);
    center(input.footer ?? 'Bidhaa zilizolipiwa hazirudishwi.', 7);
    center('Imezalishwa na MyBoke', 6);

    doc.end();
  });
}

export interface ReportPdfInput {
  title: string;
  businessName: string;
  period: string;
  columns: { header: string; key: string; width?: number; align?: 'left' | 'right' }[];
  rows: Record<string, string | number>[];
  summary?: { label: string; value: string }[];
  footer?: string;
}

/** Hutengeneza PDF ya ripoti ya A4 (landscape ikiwa na safu nyingi). */
export function reportPdf(input: ReportPdfInput): Promise<Buffer> {
  const manyColumns = input.columns.length > 5;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: manyColumns ? 'landscape' : 'portrait',
      margin: 32,
      info: { Title: input.title, Author: 'MyBoke' },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const totalWeight = input.columns.reduce(
      (acc, c) => acc + (c.width ?? 1),
      0,
    );
    const widths = input.columns.map(
      (c) => ((c.width ?? 1) / totalWeight) * pageWidth,
    );

    const drawHeader = () => {
      doc.rect(0, 0, doc.page.width, 74).fill('#0B37A1');
      doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(16)
        .text(input.title, 32, 24, { width: pageWidth });
      doc
        .font('Helvetica')
        .fontSize(9)
        .text(`${input.businessName} · ${input.period}`, 32, 46, {
          width: pageWidth,
        });
      doc.fillColor('#000000');
      doc.y = 92;
    };

    const drawTableHeader = () => {
      const y = doc.y;
      doc.rect(32, y - 2, pageWidth, 18).fill('#EAF1FB');
      doc.fillColor('#0B37A1').font('Helvetica-Bold').fontSize(8);
      let x = 32;
      input.columns.forEach((c, i) => {
        doc.text(c.header, x + 4, y + 3, {
          width: widths[i] - 8,
          align: c.align ?? 'left',
        });
        x += widths[i];
      });
      doc.fillColor('#000000');
      doc.y = y + 20;
      doc.font('Helvetica').fontSize(8);
    };

    drawHeader();
    drawTableHeader();

    let rowIndex = 0;
    for (const row of input.rows) {
      if (doc.y > doc.page.height - 90) {
        doc.addPage();
        drawHeader();
        drawTableHeader();
      }
      const y = doc.y;
      if (rowIndex % 2 === 1) {
        doc.rect(32, y - 2, pageWidth, 15).fill('#F7FAFF');
        doc.fillColor('#000000');
      }
      let x = 32;
      input.columns.forEach((c, i) => {
        doc.font('Helvetica').fontSize(8).text(String(row[c.key] ?? ''), x + 4, y + 2, {
          width: widths[i] - 8,
          align: c.align ?? 'left',
        });
        x += widths[i];
      });
      doc.y = y + 15;
      rowIndex += 1;
    }

    if (input.summary?.length) {
      doc.moveDown(0.8);
      for (const s of input.summary) {
        const y = doc.y;
        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .text(`${s.label}: `, 32, y, { width: pageWidth * 0.4, continued: true })
          .font('Helvetica')
          .text(s.value);
      }
    }

    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#666666')
      .text(
        input.footer ?? `Imezalishwa na MyBoke · ${new Date().toISOString()}`,
        32,
        doc.page.height - 40,
        { width: pageWidth },
      );

    doc.end();
  });
}
