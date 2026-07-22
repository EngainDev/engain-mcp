export function webConfig() {
  const baseUrl = (process.env.ENGAIN_BASE_URL?.trim() || "https://api.engain.io").replace(/\/+$/, "");
  const readonly = /^(1|true|yes)$/i.test(process.env.ENGAIN_MCP_READONLY?.trim() ?? "");
  return { baseUrl, readonly };
}
