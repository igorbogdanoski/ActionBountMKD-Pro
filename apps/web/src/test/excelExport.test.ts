import { describe, expect, it } from 'vitest';
import { buildSpreadsheetXml, sanitizeSheetName } from '../utils/excelExport';

describe('sanitizeSheetName', () => {
  it('strips forbidden characters and trims', () => {
    expect(sanitizeSheetName('a/b:c*?[d]')).toBe('a b c   d');
  });

  it('caps the length at 31 characters', () => {
    expect(sanitizeSheetName('x'.repeat(40))).toHaveLength(31);
  });

  it('falls back when the name is empty after cleaning', () => {
    expect(sanitizeSheetName('   ')).toBe('Лист');
    expect(sanitizeSheetName('***', 'Data')).toBe('Data');
  });
});

describe('buildSpreadsheetXml', () => {
  it('emits the Excel processing instruction and a worksheet per sheet', () => {
    const xml = buildSpreadsheetXml([
      { name: 'One', rows: [['a']] },
      { name: 'Two', rows: [['b']] },
    ]);
    expect(xml).toContain('<?mso-application progid="Excel.Sheet"?>');
    expect((xml.match(/<Worksheet /g) ?? []).length).toBe(2);
    expect(xml).toContain('ss:Name="One"');
    expect(xml).toContain('ss:Name="Two"');
  });

  it('types numeric cells as Number and others as String', () => {
    const xml = buildSpreadsheetXml([{ name: 'S', rows: [['Поени', 42]] }]);
    expect(xml).toContain('<Data ss:Type="String">Поени</Data>');
    expect(xml).toContain('<Data ss:Type="Number">42</Data>');
  });

  it('renders empty cells for null/undefined/empty values', () => {
    const xml = buildSpreadsheetXml([{ name: 'S', rows: [[null, undefined, '']] }]);
    expect((xml.match(/<Data ss:Type="String"><\/Data>/g) ?? []).length).toBe(3);
  });

  it('escapes XML-special characters in string cells', () => {
    const xml = buildSpreadsheetXml([{ name: 'S', rows: [['a & b < c > "d"']] }]);
    expect(xml).toContain('a &amp; b &lt; c &gt; &quot;d&quot;');
    expect(xml).not.toContain('a & b < c');
  });
});
