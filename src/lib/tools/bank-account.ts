export const accountKinds = ['auto', 'iban', 'clabe', 'cbu'] as const;
export type AccountKind = (typeof accountKinds)[number];

export type AccountError = 'format' | 'country' | 'length' | 'checksum' | 'unknown';

export interface AccountDetail {
  key: 'country' | 'bank' | 'bankName' | 'branch' | 'plaza' | 'account' | 'checkDigit' | 'type';
  value: string;
}

export interface AccountReport {
  input: string;
  kind: Exclude<AccountKind, 'auto'> | 'cvu' | null;
  valid: boolean;
  error: AccountError | null;
  expected: string | null;
  formatted: string;
  details: AccountDetail[];
}

const IBAN_LENGTHS: Record<string, number> = {
  AD: 24,
  AE: 23,
  AL: 28,
  AT: 20,
  AZ: 28,
  BA: 20,
  BE: 16,
  BG: 22,
  BH: 22,
  BI: 27,
  BR: 29,
  BY: 28,
  CH: 21,
  CR: 22,
  CY: 28,
  CZ: 24,
  DE: 22,
  DJ: 27,
  DK: 18,
  DO: 28,
  EE: 20,
  EG: 29,
  ES: 24,
  FI: 18,
  FK: 18,
  FO: 18,
  FR: 27,
  GB: 22,
  GE: 22,
  GI: 23,
  GL: 18,
  GR: 27,
  GT: 28,
  HN: 28,
  HR: 21,
  HU: 28,
  IE: 22,
  IL: 23,
  IQ: 23,
  IS: 26,
  IT: 27,
  JO: 30,
  KW: 30,
  KZ: 20,
  LB: 28,
  LC: 32,
  LI: 21,
  LT: 20,
  LU: 20,
  LV: 21,
  LY: 25,
  MC: 27,
  MD: 24,
  ME: 22,
  MK: 19,
  MN: 20,
  MR: 27,
  MT: 31,
  MU: 30,
  NI: 28,
  NL: 18,
  NO: 15,
  OM: 23,
  PK: 24,
  PL: 28,
  PS: 29,
  PT: 25,
  QA: 29,
  RO: 24,
  RS: 22,
  RU: 33,
  SA: 24,
  SC: 31,
  SD: 18,
  SE: 24,
  SI: 19,
  SK: 24,
  SM: 27,
  SO: 23,
  ST: 25,
  SV: 28,
  TL: 23,
  TN: 24,
  TR: 26,
  UA: 29,
  VA: 22,
  VG: 24,
  XK: 20,
  YE: 30,
};

const CLABE_BANKS: Record<string, string> = {
  '002': 'Banamex',
  '012': 'BBVA México',
  '014': 'Santander',
  '021': 'HSBC',
  '030': 'BanBajío',
  '036': 'Inbursa',
  '042': 'Mifel',
  '044': 'Scotiabank',
  '058': 'Banregio',
  '072': 'Banorte',
  '127': 'Banco Azteca',
  '137': 'BanCoppel',
  '646': 'STP',
};

const CBU_BANKS: Record<string, string> = {
  '007': 'Banco de Galicia',
  '011': 'Banco de la Nación Argentina',
  '014': 'Banco de la Provincia de Buenos Aires',
  '015': 'ICBC',
  '017': 'BBVA Argentina',
  '027': 'Banco Supervielle',
  '029': 'Banco de la Ciudad de Buenos Aires',
  '034': 'Banco Patagonia',
  '044': 'Banco Hipotecario',
  '072': 'Banco Santander Argentina',
  '150': 'HSBC Argentina',
  '191': 'Banco Credicoop',
  '285': 'Banco Macro',
};

const CLABE_WEIGHTS = [3, 7, 1];
const CBU_BLOCK1 = [7, 1, 3, 9, 7, 1, 3];
const CBU_BLOCK2 = [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3];

function report(input: string, partial: Partial<AccountReport>): AccountReport {
  return {
    input,
    kind: null,
    valid: false,
    error: null,
    expected: null,
    formatted: input,
    details: [],
    ...partial,
  };
}

function compactAccount(input: string): string {
  return input.replace(/[\s.-]/g, '').toUpperCase();
}

function ibanDigits(text: string): string {
  return Array.from(text, (char) =>
    char >= 'A' && char <= 'Z' ? String(char.charCodeAt(0) - 55) : char,
  ).join('');
}

export function mod97(digits: string): number {
  let remainder = 0;
  for (const char of digits) remainder = (remainder * 10 + Number(char)) % 97;
  return remainder;
}

export function ibanCheckDigits(iban: string): string {
  const moved = `${iban.slice(4)}${iban.slice(0, 2)}00`;
  return String(98 - mod97(ibanDigits(moved))).padStart(2, '0');
}

export function formatIban(iban: string): string {
  return iban.replace(/(.{4})/g, '$1 ').trim();
}

export function validateIban(input: string): AccountReport {
  const iban = compactAccount(input);
  const base = { kind: 'iban' as const, formatted: formatIban(iban) };
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) return report(input, { ...base, error: 'format' });
  const country = iban.slice(0, 2);
  const size = IBAN_LENGTHS[country];
  if (size === undefined) return report(input, { ...base, error: 'country' });
  const details: AccountDetail[] = [
    { key: 'country', value: country },
    { key: 'checkDigit', value: iban.slice(2, 4) },
  ];
  if (iban.length !== size) {
    return report(input, { ...base, error: 'length', expected: String(size), details });
  }
  const valid = mod97(ibanDigits(`${iban.slice(4)}${iban.slice(0, 4)}`)) === 1;
  return report(input, {
    ...base,
    valid,
    error: valid ? null : 'checksum',
    expected: valid ? null : ibanCheckDigits(iban),
    details,
  });
}

function weightedCheck(digits: string, weights: readonly number[]): number {
  let total = 0;
  for (let index = 0; index < digits.length; index++) {
    total += Number(digits[index]) * (weights[index % weights.length] ?? 0);
  }
  return (10 - (total % 10)) % 10;
}

export function clabeCheckDigit(base: string): string {
  return String(weightedCheck(base, CLABE_WEIGHTS));
}

export function validateClabe(input: string): AccountReport {
  const clabe = compactAccount(input);
  const base = { kind: 'clabe' as const };
  if (!/^\d{18}$/.test(clabe)) return report(input, { ...base, error: 'format' });
  const bank = clabe.slice(0, 3);
  const name = CLABE_BANKS[bank];
  const details: AccountDetail[] = [
    { key: 'bank', value: bank },
    ...(name ? [{ key: 'bankName' as const, value: name }] : []),
    { key: 'plaza', value: clabe.slice(3, 6) },
    { key: 'account', value: clabe.slice(6, 17) },
    { key: 'checkDigit', value: clabe.slice(17) },
  ];
  const expected = clabeCheckDigit(clabe.slice(0, 17));
  const valid = expected === clabe.slice(17);
  return report(input, {
    ...base,
    valid,
    error: valid ? null : 'checksum',
    expected: valid ? null : expected,
    formatted: `${clabe.slice(0, 3)} ${clabe.slice(3, 6)} ${clabe.slice(6, 17)} ${clabe.slice(17)}`,
    details,
  });
}

export function validateCbu(input: string): AccountReport {
  const cbu = compactAccount(input);
  if (!/^\d{22}$/.test(cbu)) return report(input, { kind: 'cbu', error: 'format' });
  const kind = cbu.startsWith('000') ? ('cvu' as const) : ('cbu' as const);
  const bank = cbu.slice(0, 3);
  const name = CBU_BANKS[bank];
  const first = String(weightedCheck(cbu.slice(0, 7), CBU_BLOCK1));
  const second = String(weightedCheck(cbu.slice(8, 21), CBU_BLOCK2));
  const valid = first === cbu[7] && second === cbu[21];
  const details: AccountDetail[] =
    kind === 'cvu'
      ? [
          { key: 'type', value: cbu.slice(3, 7) },
          { key: 'account', value: cbu.slice(8, 21) },
        ]
      : [
          { key: 'bank', value: bank },
          ...(name ? [{ key: 'bankName' as const, value: name }] : []),
          { key: 'branch', value: cbu.slice(3, 7) },
          { key: 'account', value: cbu.slice(8, 21) },
        ];
  return report(input, {
    kind,
    valid,
    error: valid ? null : 'checksum',
    expected: valid ? null : `${first}${second}`,
    formatted: `${cbu.slice(0, 8)} ${cbu.slice(8)}`,
    details,
  });
}

export function detectAccountKind(input: string): Exclude<AccountKind, 'auto'> | null {
  const clean = compactAccount(input);
  if (/^[A-Z]{2}/.test(clean)) return 'iban';
  if (/^\d{18}$/.test(clean)) return 'clabe';
  if (/^\d{22}$/.test(clean)) return 'cbu';
  return null;
}

export function validateAccount(input: string, kind: AccountKind = 'auto'): AccountReport {
  const resolved = kind === 'auto' ? detectAccountKind(input) : kind;
  if (resolved === 'iban') return validateIban(input);
  if (resolved === 'clabe') return validateClabe(input);
  if (resolved === 'cbu') return validateCbu(input);
  return report(input, { error: 'unknown' });
}

export function validateAccounts(input: string, kind: AccountKind): AccountReport[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => validateAccount(line, kind));
}
