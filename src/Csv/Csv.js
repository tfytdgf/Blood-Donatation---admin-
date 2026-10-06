// Spreadsheet apps run text that starts with = + - or @ as a formula. Free-text columns
// (names, places) get a leading apostrophe so a hostile donor name can't do that.
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value, guard) {
  let text = value == null ? '' : String(value);
  if (guard && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// columns: [{ header, get(row), guard? }]
export function toCsv(rows, columns) {
  const lines = [columns.map((c) => cell(c.header)).join(',')];
  rows.forEach((row) => lines.push(columns.map((c) => cell(c.get(row), c.guard)).join(',')));
  return lines.join('\r\n');
}

export function downloadCsv(filename, text) {
  // The BOM makes Excel read accents and non-English names correctly.
  const url = URL.createObjectURL(new Blob(['\ufeff', text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}