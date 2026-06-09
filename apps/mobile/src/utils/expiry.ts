import type { ChipProps } from '../components/Chip';

export function daysUntilExpiry(date?: string): number | null {
  if (!date) return null;
  const today = new Date();
  const expiry = new Date(`${date}T00:00:00`);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function expiryLabel(date?: string): string {
  const days = daysUntilExpiry(date);
  if (days === null) return 'NO EXPIRY';
  if (days < 0) return 'EXPIRED';
  if (days <= 1) return 'H-1';
  if (days <= 3) return 'H-3';
  if (days <= 7) return 'H-7';
  return 'FRESH';
}

export function expiryVariant(date?: string): ChipProps['variant'] {
  const days = daysUntilExpiry(date);
  if (days === null) return 'default';
  if (days < 0) return 'danger';
  if (days <= 7) return 'warning';
  return 'success';
}
