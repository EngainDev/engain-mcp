// Minimal Streamable HTTP MCP client: initialize -> tools/call <tool>
// Usage: node http-mcp-client.mjs <url> <apiKey> [tool] [argsJson]
const [url, apiKey, tool = "engain_get_me", argsJson = "{}"] = process.argv.slice(2);
const headers = {
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
  authorization: `Bearer ${apiKey}`,
};
async function rpc(body, sessionId) {
  const h = { ...headers };
  if (sessionId) h["mcp-session-id"] = sessionId;
  const res = await fetch(url, { method: "POST", headers: h, body: JSON.stringify(body) });
  const sid = res.headers.get("mcp-session-id") ?? sessionId;
  const text = await res.text();
  const line = text.split("\n").reverse().find((l) => l.startsWith("data:") || l.trim().startsWith("{"));
  const json = line ? JSON.parse(line.replace(/^data:\s*/, "")) : null;
  return { sid, json, status: res.status, raw: text };
}
const init = await rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "probe", version: "1" } } });
console.log("initialize:", init.status, init.json?.result?.serverInfo ?? init.raw.slice(0, 200));
await rpc({ jsonrpc: "2.0", method: "notifications/initialized" }, init.sid);
const call = await rpc({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: tool, arguments: JSON.parse(argsJson) } }, init.sid);
console.log(`tools/call ${tool}:`, call.status);
console.log(call.json?.result?.content?.[0]?.text ?? JSON.stringify(call.json ?? call.raw, null, 2));
