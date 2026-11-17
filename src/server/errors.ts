export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function toErrorResponse(error: unknown, requestId: string) {
  if (error instanceof ApiError) {
    return Response.json({ error: { code: error.code, message: error.message, requestId } }, { status: error.status });
  }

  console.error({ requestId, error });
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong.", requestId } }, { status: 500 });
}