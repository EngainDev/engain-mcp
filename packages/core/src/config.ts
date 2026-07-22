export interface EngainConfig {
  apiKey: string;
  baseUrl: string;
  defaultProjectId?: string;
  readonly: boolean;
  /** When set and non-empty, used for Authorization: Bearer instead of X-API-Key. */
  bearerToken?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): EngainConfig {
  const apiKey = env.ENGAIN_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "ENGAIN_API_KEY is required. Set it to your Engain API key (eng_...)."
    );
  }
  const baseUrl = (env.ENGAIN_BASE_URL?.trim() || "https://api.engain.io").replace(/\/+$/, "");
  const defaultProjectId = env.ENGAIN_PROJECT_ID?.trim() || undefined;
  const readonly = /^(1|true|yes)$/i.test(env.ENGAIN_MCP_READONLY?.trim() ?? "");
  return { apiKey, baseUrl, defaultProjectId, readonly };
}
