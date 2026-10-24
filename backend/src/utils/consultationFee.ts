// A lawyer's consultation fee, in Taka and US dollars. Either may be unset.
export type ConsultationFee = { bdt: number | null; usd: number | null };

type FeeSource = {
  consultationFee?: { bdt?: number | null; usd?: number | null } | null;
  hourlyRate?: number | null;
} | null | undefined;

const FEE_MAX = 10_000_000;
const CURRENCIES = ['bdt', 'usd'] as const;

// Older profiles only have a BDT hourlyRate; it stands in for the Taka fee
// until a fee is saved (saving one removes hourlyRate)
export const consultationFeeOf = (profile: FeeSource): ConsultationFee => ({
  bdt: profile?.consultationFee?.bdt ?? profile?.hourlyRate ?? null,
  usd: profile?.consultationFee?.usd ?? null,
});

// Accepts { bdt?, usd? } with numbers, numeric strings, or null/"" to clear.
// Returns only the currencies that were sent.
export const parseConsultationFee = (raw: unknown) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false as const, message: 'Consultation fee must be an object with bdt and usd' };
  }
  const value: Partial<ConsultationFee> = {};
  for (const currency of CURRENCIES) {
    const input = (raw as Record<string, unknown>)[currency];
    if (input === undefined) continue;
    if (input === null || input === '') {
      value[currency] = null;
      continue;
    }
    const amount = typeof input === 'string' ? Number(input) : input;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || amount > FEE_MAX) {
      const label = currency === 'bdt' ? 'Taka' : 'dollar';
      return { ok: false as const, message: `The ${label} fee must be a number from 0 to ${FEE_MAX.toLocaleString('en-US')}` };
    }
    value[currency] = Math.round(amount * 100) / 100;
  }
  return { ok: true as const, value };
};

// $set fields for a parsed fee; pair with $unset: { hourlyRate: '' }
export const consultationFeeSet = (fee: Partial<ConsultationFee>) =>
  Object.fromEntries(Object.entries(fee).map(([currency, amount]) => [`consultationFee.${currency}`, amount]));
