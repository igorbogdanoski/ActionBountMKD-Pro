/**
 * Dependency-free Excel export (Phase 7G / 5E).
 *
 * Produces SpreadsheetML 2003 (.xls) XML, which Excel, LibreOffice and Google
 * Sheets open natively with real cell types and multiple sheets — no zip/binary
 * library required. The builder is pure (deterministic, no I/O) so it is fully
 * unit-tested; downloadWorkbook() is the thin browser-only side-effect wrapper.
 */
export type CellValue = string | number | null | undefined;

export interface SheetData {
  name: string;
  rows: CellValue[][];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Excel forbids these in sheet names and caps the length at 31 chars. */
export function sanitizeSheetName(name: string, fallback = 'Лист'): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, ' ').trim();
  return (cleaned || fallback).slice(0, 31);
}

function renderCell(value: CellValue): string {
  if (value === null || value === undefined || value === '') {
    return '<Cell><Data ss:Type="String"></Data></Cell>';
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${escapeXml(String(value))}</Data></Cell>`;
}

function renderRow(cells: CellValue[]): string {
  return `   <Row>${cells.map(renderCell).join('')}</Row>`;
}

function renderSheet(sheet: SheetData): string {
  const rows = sheet.rows.map(renderRow).join('\n');
  return `  <Worksheet ss:Name="${escapeXml(sanitizeSheetName(sheet.name))}">\n  <Table>\n${rows}\n  </Table>\n  </Worksheet>`;
}

/** Builds a complete SpreadsheetML workbook string from sheet data. Pure. */
export function buildSpreadsheetXml(sheets: SheetData[]): string {
  const body = sheets.map(renderSheet).join('\n');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<?mso-application progid="Excel.Sheet"?>\n' +
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ' +
    'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n' +
    `${body}\n` +
    '</Workbook>\n'
  );
}

/** Triggers a browser download of the workbook as an .xls file. Browser-only. */
export function downloadWorkbook(sheets: SheetData[], filename: string): void {
  if (typeof document === 'undefined') return;
  const xml = buildSpreadsheetXml(sheets);
  const blob = new Blob(['\uFEFF', xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.xls') ? filename : `${filename}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
