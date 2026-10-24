/** Thrown for a non-2xx response; `data` is the parsed body (some routes return extra fields with an error). */
export class ApiError extends Error {
  constructor(message: string, readonly data: Record<string, unknown> | null) {
    super(message);
  }
}

/** fetch wrapper for our own JSON API: throws an ApiError carrying the server's `error` message. */
export async function api<T = unknown>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { headers: { 'content-type': 'application/json' }, ...init });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError((data as { error?: string } | null)?.error ?? 'Request failed', data);
  return data as T;
}
