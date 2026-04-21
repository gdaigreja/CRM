import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function formatRG(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}-${digits.slice(8, 9)}`;
}

export function formatCPF(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function formatCEP(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}-${digits.slice(5, 8)}`;
}

export function formatPercent(value: number) {
  return `${value}%`;
}

export function parseCurrency(value: string): number {
  const digits = value.replace(/\D/g, '');
  return Number(digits) / 100;
}

export function calculateRequirementDate(birthDate?: string, gender?: string): Date | null {
  if (!birthDate || !gender) return null;
  try {
    const [year, month, day] = birthDate.split('-').map(Number);
    if (!year || !month || !day) return null;
    const yearsToAdd = (gender === 'Masculino' || gender === 'masculino') ? 65 : 62;
    return new Date(year + yearsToAdd, month - 1, day);
  } catch (e) {
    return null;
  }
}

export function formatRequirementDate(date: Date | null): string {
  if (!date) return 'Não inf.';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function getRequirementStatus(date: Date | null): 'past' | 'near' | 'future' | 'unknown' {
  if (!date) return 'unknown';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const reqDate = new Date(date);
  reqDate.setHours(0, 0, 0, 0);

  if (reqDate < now) return 'past';
  
  const sevenDaysLater = new Date(now);
  sevenDaysLater.setDate(now.getDate() + 7);
  
  if (reqDate <= sevenDaysLater) return 'near';
  
  return 'future';
}
