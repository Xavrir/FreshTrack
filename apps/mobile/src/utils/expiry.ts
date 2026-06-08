import type { ChipProps } from '../components/Chip';

export type ExpiryInfo = {
  label: 'EXPIRED' | 'H-1' | 'H-3' | 'H-7' | 'FRESH';
  variant: ChipProps['variant'];
  daysLeft: number;
};

export function daysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  const [year, month, day] = expiryDate.split('-').map(Number);
  const expiry = new Date(year, month - 1, day);

  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getExpiryInfo(expiryDate: string): ExpiryInfo {
  const daysLeft = daysUntilExpiry(expiryDate);

  if (daysLeft < 0) {
    return { label: 'EXPIRED', variant: 'danger', daysLeft };
  }

  if (daysLeft <= 1) {
    return { label: 'H-1', variant: 'danger', daysLeft };
  }

  if (daysLeft <= 3) {
    return { label: 'H-3', variant: 'danger', daysLeft };
  }

  if (daysLeft <= 7) {
    return { label: 'H-7', variant: 'warning', daysLeft };
  }

  return { label: 'FRESH', variant: 'success', daysLeft };
}

export function isValidExpiryDate(expiryDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) return false;
  const [year, month, day] = expiryDate.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

export function formatExpiryDetail(expiryDate: string): string {
  const { label, daysLeft } = getExpiryInfo(expiryDate);
  if (label === 'EXPIRED') return `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} overdue`;
  return `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
}
