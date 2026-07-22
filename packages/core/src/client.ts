import type { EngainConfig } from "./config.js";

export class EngainError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public body?: unknown
  ) {
    super(message);
    this.name = "EngainError";
  }
}

export interface ClientDeps {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

const MAX_RETRIES = 3;

export class EngainClient {
  private fetchImpl: typeof fetch;
  private sleep: (ms: number) => Promise<void>;

  constructor(private config: EngainConfig, deps: ClientDeps = {}) {
    this.fetchImpl = deps.fetch ?? globalThis.fetch;
    this.sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  resolveProjectId(explicit?: string): string {
    const projectId = explicit ?? this.config.defaultProjectId;
    if (!projectId) {
      throw new EngainError(
        400,
        "missing_project_id",
        "No projectId provided and ENGAIN_PROJECT_ID is not set. Call engain_get_me to list project IDs."
      );
    }
    return projectId;
  }

  async request(method: string, path: string, opts: RequestOptions = {}): Promise<unknown> {
    const url = new URL(this.config.baseUrl + "/api/v1" + path);
    if (opts.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }
    const init: RequestInit = {
      method,
      headers: {
        ...(this.config.bearerToken
          ? { Authorization: `Bearer ${this.config.bearerToken}` }
          : { "X-API-Key": this.config.apiKey }),
        "Content-Type": "application/json",
      },
    };
    if (opts.body !== undefined) init.body = JSON.stringify(opts.body);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const res = await this.fetchImpl(url.toString(), init);
      if (res.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const delayMs =
          Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 500 * 2 ** attempt;
        await this.sleep(delayMs);
        continue;
      }
      const text = await res.text();
      const data = text ? safeJsonParse(text) : undefined;
      if (!res.ok) {
        const obj = (data ?? {}) as Record<string, unknown>;
        const code = obj.code ?? obj.error ?? `http_${res.status}`;
        const message = obj.message ?? obj.error ?? res.statusText ?? "Request failed";
        throw new EngainError(res.status, String(code), String(message), data);
      }
      return data;
    }
    throw new EngainError(429, "rate_limited", "Rate limit exceeded after retries");
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
