const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.35:4000';

export type ApiError = Error & { status?: number; code?: string };

/**
 * Fetch wrapper that attaches the session bearer token and normalises the
 * backend's error responses into a thrown Error carrying the HTTP status.
 */
export async function authedFetch(
  path: string,
  token: string | null,
  options: { method?: string; body?: unknown } = {}
): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || (data && data.success === false)) {
    const err = new Error(data?.error || data?.message || `Request failed (${res.status})`) as ApiError;
    err.status = res.status;
    err.code = data?.error;
    throw err;
  }

  return data;
}
export async function getPartnerStats(token: string) {
  return authedFetch('/api/profile/partner/stats', token);
}

export async function getPartnerHistory(token: string, page = 1, limit = 20) {
  return authedFetch(`/api/rides/partner-history?page=${page}&limit=${limit}`, token);
}

export { API_BASE };