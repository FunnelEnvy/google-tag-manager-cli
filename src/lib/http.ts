export interface HttpOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export class HttpError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public retryAfter?: number,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export async function request<T>(url: string, options: HttpOptions = {}): Promise<T> {
  const { method = 'GET', headers = {}, body, timeout = 30_000 } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      throw new HttpError(
        'Rate limit exceeded',
        'RATE_LIMITED',
        429,
        retryAfter ? parseInt(retryAfter) : undefined,
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new HttpError(
        'Authentication failed. Check your credentials or run: gtm auth login',
        'AUTH_FAILED',
        response.status,
      );
    }

    if (response.status === 404) {
      throw new HttpError(
        'Resource not found. Check the IDs provided.',
        'NOT_FOUND',
        response.status,
      );
    }

    if (!response.ok) {
      const text = await response.text();
      let message = `HTTP ${response.status}`;
      try {
        const json = JSON.parse(text);
        message = json.error?.message ?? json.message ?? text;
      } catch {
        message = text || message;
      }
      throw new HttpError(message, 'API_ERROR', response.status);
    }

    const text = await response.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= maxRetries) break;
      if (error instanceof HttpError && error.retryAfter) {
        await sleep(error.retryAfter * 1000);
      } else {
        const delay = initialDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
