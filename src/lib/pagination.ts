export const MAX_PAGE_SIZE = 100;

export function parsePagination(searchParams: URLSearchParams, defaultLimit = 10) {
  const pageRaw = Number.parseInt(searchParams.get("page") || "1", 10);
  const limitRaw = Number.parseInt(searchParams.get("limit") || String(defaultLimit), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(MAX_PAGE_SIZE, limitRaw) : defaultLimit;
  return { page, limit, skip: (page - 1) * limit };
}
