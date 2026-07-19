export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code = "HTTP_ERROR",
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export function isUniqueViolation(error: { code?: string } | null | undefined) {
  return error?.code === "23505";
}
