import { BadRequestException } from '@nestjs/common';
import { parseDate, parseId, parseName } from './validation';

describe('parseId', () => {
  it('accepts numbers and numeric text', () => {
    expect(parseId(3, 'sectorId')).toBe(3);
    expect(parseId('12', 'areaId')).toBe(12);
  });

  it.each([0, -1, 1.5, 'abc', '', null, undefined, 3_000_000_000])(
    'rejects %p',
    (value) => {
      expect(() => parseId(value, 'sectorId')).toThrow(BadRequestException);
    },
  );
});

describe('parseName', () => {
  it('collapses spaces and line breaks', () => {
    expect(parseName('  ANA \n SOUZA ', 'patientName')).toBe('ANA SOUZA');
  });

  it.each(['', '   ', 42, null, 'A'.repeat(101)])('rejects %p', (value) => {
    expect(() => parseName(value, 'patientName')).toThrow(BadRequestException);
  });
});

describe('parseDate', () => {
  it('accepts a real calendar date', () => {
    expect(parseDate('2026-11-02')).toBe('2026-11-02');
  });

  it.each(['2026-02-30', '2026-13-01', '02/11/2026', '2026-11-02; DROP', 5])(
    'rejects %p',
    (value) => {
      expect(() => parseDate(value)).toThrow(BadRequestException);
    },
  );
});
