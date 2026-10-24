// A lawyer's consultation fee in Taka and US dollars; either may be unset
export interface ConsultationFee {
  bdt: number | null
  usd: number | null
}

const amount = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 })

export const formatBdt = (value: number) => `৳${amount(value)}`
export const formatUsd = (value: number) => `$${amount(value)}`

/** The fee amounts that are set, Taka first, e.g. ["৳5,000", "$45"] */
export function feeParts(fee?: Partial<ConsultationFee> | null): string[] {
  const parts: string[] = []
  if (fee?.bdt != null) parts.push(formatBdt(fee.bdt))
  if (fee?.usd != null) parts.push(formatUsd(fee.usd))
  return parts
}

/** "৳5,000 / $45", or "" when no fee is set */
export const formatFee = (fee?: Partial<ConsultationFee> | null) => feeParts(fee).join(' / ')
