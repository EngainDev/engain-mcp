import { EngainClient } from "../src/client.js";

// Live READ-ONLY smoke test against a real Engain deployment.
// No credit-spending calls are made here.
//
// Usage:
//   ENGAIN_API_KEY=<key> [ENGAIN_BASE_URL=https://your-deployment] tsx scripts/smoke.ts
const apiKey = process.env.ENGAIN_API_KEY;
const baseUrl = process.env.ENGAIN_BASE_URL ?? "https://api.engain.io";
if (!apiKey) throw new Error("ENGAIN_API_KEY required");

const client = new EngainClient({ apiKey, baseUrl, readonly: true });

const me = (await client.request("GET", "/me")) as {
  userId: string;
  projects: { id: string; name: string }[];
};
console.log("me:", JSON.stringify(me, null, 2));

const balance = await client.request("GET", "/balance");
console.log("balance:", JSON.stringify(balance, null, 2));

const projectId = process.env.ENGAIN_PROJECT_ID ?? me.projects[0]?.id;
if (projectId) {
  const tasks = await client.request("GET", "/tasks", { query: { projectId, numItems: 3 } });
  console.log("tasks (first 3):", JSON.stringify(tasks, null, 2));
} else {
  console.log("no project to list tasks for");
}
console.log("SMOKE OK");
