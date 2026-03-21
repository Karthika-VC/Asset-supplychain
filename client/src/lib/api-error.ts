export type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
    requestId?: string | null;
    timestamp?: string;
  };
  message?: string;
};

export async function getApiErrorMessage(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  const payload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
  const details = payload?.error?.details as
    | {
        field?: string;
        issue?: string;
      }
    | undefined;

  if (payload?.error?.message && details?.field && details?.issue) {
    return `${payload.error.message}: ${details.field} ${details.issue}`;
  }

  if (payload?.error?.message) return payload.error.message;
  if (payload?.message) return payload.message;
  return fallbackMessage;
}
