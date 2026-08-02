import type { ParcelRow } from './dashboard-types';

const COLUMNS: { key: keyof ParcelRow; header: string }[] = [
  { key: 'trackingId', header: 'Tracking ID' },
  { key: 'carrier', header: 'Carrier' },
  { key: 'status', header: 'Status' },
  { key: 'actualLocation', header: 'Location' },
  { key: 'recipientName', header: 'Recipient' },
  { key: 'recipientDepartment', header: 'Department' },
  { key: 'sourceSystem', header: 'Source' },
  { key: 'timestampLastEvent', header: 'Last Event' },
];

function escapeCell(value: unknown): string {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function parcelsToCsv(rows: ParcelRow[]): string {
  const header = COLUMNS.map((c) => c.header).join(',');
  const lines = rows.map((row) => COLUMNS.map((c) => escapeCell(row[c.key])).join(','));
  return [header, ...lines].join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
