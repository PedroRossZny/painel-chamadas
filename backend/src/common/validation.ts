import { BadRequestException } from '@nestjs/common';

const MAX_NAME_LENGTH = 100;
const MAX_POSTGRES_INTEGER = 2_147_483_647;

/** Accepts an id sent in the URL (as text) or in a JSON body (as a number). */
export function parseId(value: unknown, field: string): number {
  const id = typeof value === 'string' ? Number(value) : value;

  if (
    typeof id !== 'number' ||
    !Number.isInteger(id) ||
    id <= 0 ||
    id > MAX_POSTGRES_INTEGER
  ) {
    throw new BadRequestException(`Valor inválido para ${field}.`);
  }

  return id;
}

/**
 * Names are read aloud and shown on the TV, so line breaks and repeated
 * spaces are collapsed and the length is limited.
 */
export function parseName(value: unknown, field: string): string {
  const name =
    typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

  if (name.length === 0 || name.length > MAX_NAME_LENGTH) {
    throw new BadRequestException(
      `${field} deve ter entre 1 e ${MAX_NAME_LENGTH} caracteres.`,
    );
  }

  return name;
}

/** Accepts a calendar date in the YYYY-MM-DD format used by <input type="date">. */
export function parseDate(value: unknown): string {
  const date =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00Z`)
      : null;

  // Impossible days such as 2026-02-30 roll over to another date, so the
  // result has to match the text that was sent.
  const isValid =
    date !== null &&
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;

  if (!isValid) {
    throw new BadRequestException('Data inválida. Use o formato AAAA-MM-DD.');
  }

  return value;
}
