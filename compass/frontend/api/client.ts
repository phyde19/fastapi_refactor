const API_BASE_URL = process.env.NEXT_PUBLIC_COMPASS_API_BASE_URL ?? "http://localhost:8000";

class HttpError extends Error {
  status: number;

  bodyText: string;

  constructor(status: number, bodyText: string) {
    super(`HTTP ${status}: ${bodyText}`);
    this.status = status;
    this.bodyText = bodyText;
  }
}

function createHeaders(extra?: Record<string, string>) {
  return {
    "Content-Type": "application/json",
    ...extra
  };
}

async function parseBodyText(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text || response.statusText;
  } catch {
    return response.statusText;
  }
}

export class ApiClient {
  static buildUrl(path: string): string {
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    return `${API_BASE_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  }

  static async getJson<T>(path: string): Promise<T> {
    const response = await fetch(ApiClient.buildUrl(path), {
      method: "GET",
      headers: createHeaders()
    });
    if (!response.ok) {
      throw new HttpError(response.status, await parseBodyText(response));
    }
    return (await response.json()) as T;
  }

  static async postJson<TRequest, TResponse>(
    path: string,
    body: TRequest,
    init?: RequestInit
  ): Promise<TResponse> {
    const response = await fetch(ApiClient.buildUrl(path), {
      method: "POST",
      headers: createHeaders(),
      body: JSON.stringify(body),
      ...init
    });
    if (!response.ok) {
      throw new HttpError(response.status, await parseBodyText(response));
    }
    return (await response.json()) as TResponse;
  }

  static async putJson<TRequest, TResponse>(path: string, body: TRequest): Promise<TResponse> {
    const response = await fetch(ApiClient.buildUrl(path), {
      method: "PUT",
      headers: createHeaders(),
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new HttpError(response.status, await parseBodyText(response));
    }
    return (await response.json()) as TResponse;
  }

  static async postStream<TRequest>(
    path: string,
    body: TRequest,
    signal?: AbortSignal
  ): Promise<Response> {
    const response = await fetch(ApiClient.buildUrl(path), {
      method: "POST",
      headers: createHeaders({
        Accept: "application/x-ndjson"
      }),
      body: JSON.stringify(body),
      signal
    });
    if (!response.ok) {
      throw new HttpError(response.status, await parseBodyText(response));
    }
    return response;
  }
}

export { HttpError };
