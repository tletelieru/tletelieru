export type BankCodeKind = 'bic' | 'aba' | 'sort';

export type BankCodeError = 'format' | 'country' | 'checksum' | 'unknown';

export interface BankCodeDetail {
  key:
    | 'institution'
    | 'country'
    | 'location'
    | 'branch'
    | 'testCode'
    | 'passive'
    | 'primaryOffice'
    | 'routingSymbol'
    | 'institutionId'
    | 'bank'
    | 'branchCode';
  value: string;
}

export interface BankCodeReport {
  input: string;
  kind: BankCodeKind | null;
  valid: boolean;
  error: BankCodeError | null;
  formatted: string;
  details: BankCodeDetail[];
}

const COUNTRY_CODES = new Set(
  (
    'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS ' +
    'BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE ' +
    'EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM ' +
    'HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC ' +
    'LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA ' +
    'NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW ' +
    'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO ' +
    'TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'
  ).split(' '),
);

const ABA_WEIGHTS = [3, 7, 1, 3, 7, 1, 3, 7, 1];

function report(input: string, partial: Partial<BankCodeReport>): BankCodeReport {
  return {
    input,
    kind: null,
    valid: false,
    error: null,
    formatted: input,
    details: [],
    ...partial,
  };
}

export function validateBic(input: string): BankCodeReport {
  const bic = input.replace(/\s/g, '').toUpperCase();
  const base = { kind: 'bic' as const, formatted: bic };
  if (!/^[A-Z0-9]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/.test(bic)) {
    return report(input, { ...base, error: 'format' });
  }
  const country = bic.slice(4, 6);
  const location = bic.slice(6, 8);
  const branch = bic.slice(8);
  const details: BankCodeDetail[] = [
    { key: 'institution', value: bic.slice(0, 4) },
    { key: 'country', value: country },
    { key: 'location', value: location },
    ...(branch !== '' ? [{ key: 'branch' as const, value: branch }] : []),
    ...(branch === '' || branch === 'XXX' ? [{ key: 'primaryOffice' as const, value: '' }] : []),
    ...(location[1] === '0' ? [{ key: 'testCode' as const, value: '' }] : []),
    ...(location[1] === '1' ? [{ key: 'passive' as const, value: '' }] : []),
  ];
  if (!COUNTRY_CODES.has(country)) return report(input, { ...base, error: 'country', details });
  return report(input, { ...base, valid: true, details });
}

function isAbaPrefix(prefix: number): boolean {
  return (
    prefix <= 12 ||
    (prefix >= 21 && prefix <= 32) ||
    (prefix >= 61 && prefix <= 72) ||
    prefix === 80
  );
}

export function validateAba(input: string): BankCodeReport {
  const aba = input.replace(/[\s-]/g, '');
  const base = { kind: 'aba' as const, formatted: aba };
  if (!/^\d{9}$/.test(aba) || !isAbaPrefix(Number(aba.slice(0, 2)))) {
    return report(input, { ...base, error: 'format' });
  }
  const total = ABA_WEIGHTS.reduce((sum, weight, index) => sum + weight * Number(aba[index]), 0);
  const details: BankCodeDetail[] = [
    { key: 'routingSymbol', value: aba.slice(0, 4) },
    { key: 'institutionId', value: aba.slice(4, 8) },
  ];
  if (total % 10 !== 0) return report(input, { ...base, error: 'checksum', details });
  return report(input, { ...base, valid: true, details });
}

export function validateSortCode(input: string): BankCodeReport {
  const clean = input.trim();
  const base = { kind: 'sort' as const };
  if (!/^\d{2}[-\s]?\d{2}[-\s]?\d{2}$/.test(clean)) {
    return report(input, { ...base, error: 'format' });
  }
  const digits = clean.replace(/[-\s]/g, '');
  return report(input, {
    ...base,
    valid: true,
    formatted: `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`,
    details: [
      { key: 'bank', value: digits.slice(0, 2) },
      { key: 'branchCode', value: digits.slice(2) },
    ],
  });
}

export function validateBankCode(input: string): BankCodeReport {
  const clean = input.trim();
  if (/^\d{2}[-\s]?\d{2}[-\s]?\d{2}$/.test(clean)) return validateSortCode(clean);
  if (/^[\d\s-]+$/.test(clean)) {
    return clean.replace(/[\s-]/g, '').length === 9
      ? validateAba(clean)
      : report(input, { error: 'unknown' });
  }
  return /[A-Za-z]/.test(clean) ? validateBic(clean) : report(input, { error: 'unknown' });
}

export function validateBankCodes(input: string): BankCodeReport[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(validateBankCode);
}
