/** @type {import('next').NextConfig} */
const nextConfig = {
  // engain-mcp ships ESM/TS-compiled JS; nothing special needed since it's a normal dep.
  serverExternalPackages: ["@modelcontextprotocol/sdk"],
};
export default nextConfig;
