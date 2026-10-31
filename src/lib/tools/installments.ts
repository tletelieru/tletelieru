import {
  add,
  compare,
  divide,
  formatDecimal,
  fromPercent,
  isZero,
  multiply,
  parseDecimal,
  pow10,
  power,
  round,
  subtract,
  ZERO,
  type Decimal,
} from './_shared/decimal';
import { clampInt } from './_shared/lines';

export const rateKinds = ['monthly', 'annual'] as const;
export type RateKind = (typeof rateKinds)[number];

export interface InstallmentOptions {
  principal: string;
  periods: number;
  rate: string;
  rateKind: RateKind;
  fee: string;
  decimals: number;
}

export interface InstallmentRow {
  period: number;
  payment: string;
  interest: string;
  amortization: string;
  balance: string;
}

export interface InstallmentResult {
  payment: string;
  monthlyRate: string;
  totalPaid: string;
  totalInterest: string;
  fee: string;
  received: string;
  irrMonthly: string | null;
  caeNominal: string | null;
  caeEffective: string | null;
  rows: InstallmentRow[];
}

export type InstallmentError = 'principal' | 'periods' | 'rate' | 'fee';

export const MAX_PERIODS = 600;

const WORK_SCALE = 30;
const IRR_SCALE = 18;
const IRR_STEPS = 80;
const RATE_DECIMALS = 4;
const ONE: Decimal = { units: 1n, scale: 0 };
const TWELVE: Decimal = { units: 12n, scale: 0 };
const HUNDRED: Decimal = { units: 100n, scale: 0 };

function levelPayment(principal: Decimal, rate: Decimal, periods: number): Decimal {
  if (isZero(rate)) return divide(principal, { units: BigInt(periods), scale: 0 }, WORK_SCALE);
  const growth = power(add(ONE, rate), periods, WORK_SCALE);
  const factor = divide(multiply(rate, growth), subtract(growth, ONE), WORK_SCALE);
  return multiply(principal, factor);
}

function presentValue(payments: readonly bigint[], rate: bigint, unit: bigint): bigint {
  let value = 0n;
  for (let index = payments.length - 1; index >= 0; index--) {
    value = ((value + (payments[index] ?? 0n)) * unit) / (unit + rate);
  }
  return value;
}

export function solveMonthlyIrr(received: Decimal, payments: readonly Decimal[]): Decimal | null {
  const unit = pow10(IRR_SCALE);
  const target = round(received, IRR_SCALE, 'down').units;
  const flows = payments.map((payment) => round(payment, IRR_SCALE, 'down').units);
  if (target <= 0n || presentValue(flows, 0n, unit) < target) return null;
  let low = 0n;
  let high = unit;
  while (presentValue(flows, high, unit) > target) {
    high *= 2n;
    if (high > unit * 1024n) return null;
  }
  for (let step = 0; step < IRR_STEPS; step++) {
    const middle = (low + high) / 2n;
    if (presentValue(flows, middle, unit) > target) low = middle;
    else high = middle;
  }
  return { units: high, scale: IRR_SCALE };
}

function percent(value: Decimal): string {
  return formatDecimal(round(multiply(value, HUNDRED), RATE_DECIMALS));
}

export function simulateInstallments(
  options: InstallmentOptions,
): InstallmentResult | { error: InstallmentError } {
  const principal = parseDecimal(options.principal);
  if (!principal || compare(principal, ZERO) <= 0) return { error: 'principal' };
  if (!Number.isInteger(options.periods) || options.periods < 1 || options.periods > MAX_PERIODS) {
    return { error: 'periods' };
  }
  const rateValue = parseDecimal(options.rate);
  if (!rateValue || compare(rateValue, ZERO) < 0) return { error: 'rate' };
  const fee = parseDecimal(options.fee === '' ? '0' : options.fee);
  if (!fee || compare(fee, ZERO) < 0 || compare(fee, principal) >= 0) return { error: 'fee' };

  const decimals = clampInt(options.decimals, 0, 6);
  const nominal = fromPercent(rateValue);
  const monthly = options.rateKind === 'annual' ? divide(nominal, TWELVE, WORK_SCALE) : nominal;
  const payment = round(levelPayment(principal, monthly, options.periods), decimals);

  const rows: InstallmentRow[] = [];
  const payments: Decimal[] = [];
  let balance = round(principal, decimals);
  let totalInterest: Decimal = ZERO;
  let totalPaid: Decimal = ZERO;
  for (let period = 1; period <= options.periods; period++) {
    const interest = round(multiply(balance, monthly), decimals);
    const last = period === options.periods;
    const amortization = last ? balance : subtract(payment, interest);
    const installment = last ? add(balance, interest) : payment;
    balance = subtract(balance, amortization);
    totalInterest = add(totalInterest, interest);
    totalPaid = add(totalPaid, installment);
    payments.push(installment);
    rows.push({
      period,
      payment: formatDecimal(round(installment, decimals)),
      interest: formatDecimal(interest),
      amortization: formatDecimal(round(amortization, decimals)),
      balance: formatDecimal(round(balance, decimals)),
    });
  }

  const roundedFee = round(fee, decimals);
  const received = subtract(round(principal, decimals), roundedFee);
  const irr = solveMonthlyIrr(received, payments);
  return {
    payment: formatDecimal(payment),
    monthlyRate: percent(monthly),
    totalPaid: formatDecimal(totalPaid),
    totalInterest: formatDecimal(totalInterest),
    fee: formatDecimal(roundedFee),
    received: formatDecimal(received),
    irrMonthly: irr && percent(irr),
    caeNominal: irr && percent(multiply(irr, TWELVE)),
    caeEffective: irr && percent(subtract(power(add(ONE, irr), 12, WORK_SCALE), ONE)),
    rows,
  };
}
