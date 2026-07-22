import { z } from "zod";
import { defineTool, type EngainTool } from "./types.js";

const projectIdField = z
  .string()
  .optional()
  .describe("Engain project (campaign) ID. Defaults to ENGAIN_PROJECT_ID if set.");

export const labelTools: EngainTool[] = [
  defineTool({
    name: "engain_list_labels",
    description: "List all labels defined in a project.",
    inputSchema: z.object({ projectId: projectIdField }),
    spendsCredits: false,
    handler: (args, client) =>
      client.request("GET", "/labels", {
        query: { projectId: client.resolveProjectId(args.projectId) },
      }),
  }),
  defineTool({
    name: "engain_create_label",
    description: "Create a new label in a project.",
    inputSchema: z.object({ projectId: projectIdField, name: z.string() }),
    spendsCredits: false,
    handler: (args, client) =>
      client.request("POST", "/labels", {
        body: { projectId: client.resolveProjectId(args.projectId), name: args.name },
      }),
  }),
  defineTool({
    name: "engain_delete_label",
    description: "Delete a label from a project by name.",
    inputSchema: z.object({ projectId: projectIdField, labelName: z.string() }),
    spendsCredits: false,
    handler: (args, client) =>
      client.request("DELETE", `/labels/${encodeURIComponent(args.labelName)}`, {
        query: { projectId: client.resolveProjectId(args.projectId) },
      }),
  }),
  defineTool({
    name: "engain_add_task_labels",
    description: "Add one or more labels to a task.",
    inputSchema: z.object({ taskId: z.string(), labels: z.array(z.string()).min(1) }),
    spendsCredits: false,
    handler: (args, client) =>
      client.request("POST", "/labels/add-to-task", { body: { taskId: args.taskId, labels: args.labels } }),
  }),
  defineTool({
    name: "engain_remove_task_labels",
    description: "Remove one or more labels from a task.",
    inputSchema: z.object({ taskId: z.string(), labels: z.array(z.string()).min(1) }),
    spendsCredits: false,
    handler: (args, client) =>
      client.request("POST", "/labels/remove-from-task", { body: { taskId: args.taskId, labels: args.labels } }),
  }),
  defineTool({
    name: "engain_add_order_labels",
    description: "Add one or more labels to an order.",
    inputSchema: z.object({ orderId: z.string(), labels: z.array(z.string()).min(1) }),
    spendsCredits: false,
    handler: (args, client) =>
      client.request("POST", "/labels/add-to-order", { body: { orderId: args.orderId, labels: args.labels } }),
  }),
  defineTool({
    name: "engain_remove_order_labels",
    description: "Remove one or more labels from an order.",
    inputSchema: z.object({ orderId: z.string(), labels: z.array(z.string()).min(1) }),
    spendsCredits: false,
    handler: (args, client) =>
      client.request("POST", "/labels/remove-from-order", { body: { orderId: args.orderId, labels: args.labels } }),
  }),
];
