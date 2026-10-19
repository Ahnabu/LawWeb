// Reads ?page=&limit= safely: junk, zero or negative values fall back to the
// defaults and limit is capped, so a client cannot ask for the whole collection.
export const parsePagination = (
  query: Record<string, unknown>,
  { defaultLimit = 20, maxLimit = 100 }: { defaultLimit?: number; maxLimit?: number } = {}
) => {
  const toPositiveInt = (value: unknown, fallback: number) => {
    const n = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  const page = toPositiveInt(query.page, 1);
  const limit = Math.min(toPositiveInt(query.limit, defaultLimit), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
};

// { _id: status, n } rows from a $group into { status: n }
export const toCountMap = (rows: { _id: unknown; n: number }[]) =>
  Object.fromEntries(rows.map((r) => [String(r._id), r.n])) as Record<string, number>;
