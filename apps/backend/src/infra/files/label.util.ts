import bwipjs from 'bwip-js';
import PDFDocument from 'pdfkit';

export type LabelSize = '40x30' | '50x25' | '38x25';
export type BarcodeFormat = 'code128' | 'ean13' | 'qrcode';

export interface LabelItem {
  name: string;
  price: string;
  barcode: string;
  shopName: string;
}

const MM = 2.834_645_669; // 1mm kwa points
const PAGE = { width: 595.28, height: 841.89 }; // A4
const MARGIN = 14;

const SIZES: Record<LabelSize, { w: number; h: number }> = {
  '40x30': { w: 40 * MM, h: 30 * MM },
  '50x25': { w: 50 * MM, h: 25 * MM },
  '38x25': { w: 38 * MM, h: 25 * MM },
};

/** Tengeneza PNG ya barcode/QR kwa bwip-js. */
async function barcodePng(
  data: string,
  format: BarcodeFormat,
  scale = 2,
): Promise<Buffer> {
  const bcid =
    format === 'qrcode' ? 'qrcode' : format === 'ean13' ? 'ean13' : 'code128';
  // EAN-13 inahitaji tarakimu 12/13 — tumia code128 kama data si sahihi.
  const text =
    bcid === 'ean13' && !/^\d{12,13}$/.test(data) ? data : data;
  const resolved = bcid === 'ean13' && !/^\d{12,13}$/.test(data) ? 'code128' : bcid;
  const png = await bwipjs.toBuffer(
    resolved === 'qrcode'
      ? { bcid: 'qrcode', text, scale }
      : {
          bcid: resolved,
          text,
          scale,
          height: 8,
          includetext: true,
          textxalign: 'center',
        },
  );
  return Buffer.from(png);
}

function cut(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export async function buildLabelsPdf(
  items: LabelItem[],
  size: LabelSize = '40x30',
  format: BarcodeFormat = 'code128',
  copies = 1,
): Promise<Buffer> {
  const dim = SIZES[size] ?? SIZES['40x30'];
  const perRow = Math.max(1, Math.floor((PAGE.width - MARGIN * 2) / dim.w));
  const perCol = Math.max(1, Math.floor((PAGE.height - MARGIN * 2) / dim.h));

  // Pre-render barcodes kwa kila bidhaa (PNG moja kwa bidhaa).
  const images = await Promise.all(
    items.map(async (item) => {
      try {
        return await barcodePng(item.barcode, format, size === '38x25' ? 1 : 2);
      } catch {
        return null;
      }
    }),
  );

  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    autoFirstPage: true,
    info: { Title: 'MyBoke — Lebo za Barcode' },
  });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  const all: { item: LabelItem; png: Buffer | null }[] = [];
  items.forEach((item, i) => {
    for (let c = 0; c < Math.max(1, copies); c += 1) {
      all.push({ item, png: images[i] });
    }
  });

  const slots = perRow * perCol;
  all.forEach((entry, index) => {
    const slot = index % slots;
    if (index > 0 && slot === 0) doc.addPage();
    const row = Math.floor(slot / perRow);
    const col = slot % perRow;
    const x = MARGIN + col * dim.w;
    const y = MARGIN + row * dim.h;

    doc.rect(x, y, dim.w, dim.h).lineWidth(0.4).stroke('#D0D7E2');

    const inner = 3;
    doc
      .font('Helvetica-Bold')
      .fontSize(6.2)
      .fillColor('#0E1B2C')
      .text(cut(entry.item.name, 34), x + inner, y + inner, {
        width: dim.w - inner * 2,
        height: 8,
        ellipsis: true,
      });

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#0E1B2C')
      .text(entry.item.price, x + inner, y + inner + 8, {
        width: dim.w - inner * 2,
        align: 'right',
      });

    if (entry.png) {
      const imgW = dim.w - inner * 2 - 6;
      const imgH = Math.max(10, dim.h - 34);
      try {
        doc.image(entry.png, x + inner + 3, y + 18, {
          fit: [imgW, imgH],
          align: 'center',
          valign: 'center',
        });
      } catch {
        /* picha imeshindikana — bado tunachapisha jina */
      }
    }

    doc
      .font('Helvetica')
      .fontSize(5)
      .fillColor('#5A6B84')
      .text(cut(entry.item.shopName, 40), x + inner, y + dim.h - 8, {
        width: dim.w - inner * 2,
        align: 'center',
      });
  });

  doc.end();
  return done;
}
