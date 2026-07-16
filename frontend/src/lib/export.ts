function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadText(filename: string, content: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  triggerDownload(blob, filename);
}

function csvEscape(value: unknown): string {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCSV<T extends object>(filename: string, rows: T[]) {
  if (rows.length === 0) return;
  const data = rows as unknown as Record<string, unknown>[];
  const headers = Object.keys(data[0]);
  const lines = [
    headers.join(','),
    ...data.map((row) => headers.map((h) => csvEscape(row[h])).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

export async function exportExcel<T extends object>(filename: string, sheetName: string, rows: T[]) {
  if (rows.length === 0) return;
  // Loaded on demand — exceljs is large and most visits never click "Export
  // Excel", so it shouldn't bloat every page's initial bundle.
  const { default: ExcelJS } = await import('exceljs');
  const data = rows as unknown as Record<string, unknown>[];
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  const headers = Object.keys(data[0]);
  sheet.columns = headers.map((h) => ({ header: h, key: h, width: 22 }));
  sheet.addRows(data);
  sheet.getRow(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, filename);
}
