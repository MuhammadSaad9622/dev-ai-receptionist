const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:3001/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function request<T>(
  path: string,
  accessToken: string | undefined,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
