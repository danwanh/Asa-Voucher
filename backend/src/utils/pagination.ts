export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  { page, limit }: PaginationParams,
): PaginatedResult<T> {
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}
