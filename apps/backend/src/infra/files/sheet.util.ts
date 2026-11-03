import * as ExcelJS from 'exceljs';

export type SheetRow = Record<string, string>;

export interface ParsedSheet {
  headers: string[];
  rows: SheetRow[];
}

/**
 * Husoma CSV au XLSX kutoka buffer.
 * Safu ya kwanza ni vichwa; mistari mitupu inapitwa.
 */
export async function parseSpreadsheet(
  buffer: Buffer,
  filename: string,
): Promise<ParsedSheet> {
  const lower = filename.toLowerCase();

  if (lower.endsWith('.csv')) {
    return parseCsv(buffer.toString('utf8'));
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) return { headers: [], rows: [] };

  const headers: string[] = [];
  ws.getRow(1).eachCell((cell, col) => {
    headers[col - 1] = String(cell.value ?? '').trim();
  });

  const rows: SheetRow[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: SheetRow = {};
    let hasValue = false;
    headers.forEach((h, i) => {
      const raw = row.getCell(i + 1).value;
      const value = cellToString(raw);
      if (value) hasValue = true;
      if (h) obj[h] = value;
    });
    if (hasValue) rows.push(obj);
  });

  return { headers: headers.filter(Boolean), rows };
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    const v = value as unknown as Record<string, unknown>;
    if (Array.isArray(v.richText)) {
      return (v.richText as { text: string }[])
        .map((t) => t.text)
        .join('')
        .trim();
    }
    if (typeof v.text === 'string') return v.text.trim();
    if ('result' in v) return String(v.result ?? '').trim();
    if ('formula' in v) return '';
    return '';
  }
  return String(value).trim();
}

/** CSV parser rahisi yenye msaada wa quotes. */
export function parseCsv(text: string): ParsedSheet {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = splitCsvLine(lines[0]);
  const rows: SheetRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i]);
    const obj: SheetRow = {};
    headers.forEach((h, idx) => {
      if (h) obj[h] = (cells[idx] ?? '').trim();
    });
    rows.push(obj);
  }

  return { headers, rows };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/** Hutengeneza XLSX buffer kutoka safu za data. */
export async function buildXlsx(
  sheetName: string,
  columns: { header: string; key: string; width?: number }[],
  rows: Record<string, unknown>[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MyBoke';
  wb.created = new Date();

  const ws = wb.addWorksheet(sheetName);
  ws.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width ?? 18,
  }));

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0269E9' },
  };
  header.alignment = { vertical: 'middle' };

  for (const row of rows) {
    ws.addRow(row);
  }

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** CSV buffer kutoka safu za data. */
export function buildCsv(
  columns: { header: string; key: string }[],
  rows: Record<string, unknown>[],
): Buffer {
  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [columns.map((c) => escape(c.header)).join(',')];
  for (const row of rows) {
    lines.push(columns.map((c) => escape(row[c.key])).join(','));
  }
  return Buffer.from(lines.join('\n'), 'utf8');
}

/** Template ya bidhaa — hutumika kwa `GET /products/import/template`. */
export const PRODUCT_IMPORT_COLUMNS = [
  { header: 'Jina', key: 'name', width: 32 },
  { header: 'Barcode', key: 'barcode', width: 18 },
  { header: 'Category', key: 'category', width: 20 },
  { header: 'Unit', key: 'unit', width: 10 },
  { header: 'Bei ya kununua', key: 'buyingPrice', width: 18 },
  { header: 'Bei ya kuuza', key: 'sellingPrice', width: 18 },
  { header: 'Stock', key: 'stock', width: 10 },
  { header: 'Alert', key: 'alertLevel', width: 10 },
];
