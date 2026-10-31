import { diffValues, type ArrayMode, type JsonChange } from './json-diff';
import {
  decodeJwt,
  describeClaimTimes,
  timeClaims,
  type ClaimTime,
  type JwtDecoded,
  type JwtError,
  type TimeClaim,
} from './jwt';

export type DiffSide = 'left' | 'right';

export interface ClaimTimeChange {
  claim: TimeClaim;
  left: ClaimTime | null;
  right: ClaimTime | null;
  deltaSeconds: number | null;
}

export interface JwtDiff {
  header: JsonChange[];
  payload: JsonChange[];
  times: ClaimTimeChange[];
  signatureChanged: boolean;
}

export type JwtDiffResult =
  { ok: true; diff: JwtDiff } | { ok: false; side: DiffSide; error: JwtError };

function times(jwt: JwtDecoded, zone: string, locale: string): Map<TimeClaim, ClaimTime> {
  return new Map(
    describeClaimTimes(jwt.claims, 0, zone, locale).map((time) => [time.claim, time] as const),
  );
}

export function diffJwts(
  left: string,
  right: string,
  mode: ArrayMode = 'index',
  zone = 'UTC',
  locale = 'en',
): JwtDiffResult {
  const before = decodeJwt(left, 0);
  if (!before.ok) return { ok: false, side: 'left', error: before.error };
  const after = decodeJwt(right, 0);
  if (!after.ok) return { ok: false, side: 'right', error: after.error };

  const leftTimes = times(before.jwt, zone, locale);
  const rightTimes = times(after.jwt, zone, locale);
  const changedTimes = timeClaims.flatMap((claim): ClaimTimeChange[] => {
    const a = leftTimes.get(claim) ?? null;
    const b = rightTimes.get(claim) ?? null;
    if (a?.seconds === b?.seconds) return [];
    const deltaSeconds = a && b ? b.seconds - a.seconds : null;
    return [{ claim, left: a, right: b, deltaSeconds }];
  });

  return {
    ok: true,
    diff: {
      header: diffValues(before.jwt.header, after.jwt.header, mode),
      payload: diffValues(before.jwt.payload, after.jwt.payload, mode),
      times: changedTimes,
      signatureChanged: before.jwt.parts.signature !== after.jwt.parts.signature,
    },
  };
}
