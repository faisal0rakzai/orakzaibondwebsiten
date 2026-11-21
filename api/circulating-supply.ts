/// <reference lib="dom" />

declare const process: { env: Record<string, string | undefined> };

export const config = { runtime: "edge" };

// A circulating-supply number is intentionally not published yet.
// Defensible methodology once verified exclusions exist:
//   totalSupply() - sum(balanceOf(address))
// for only verified burn, treasury, locked, and vesting addresses.
// The current project data does not provide a verified treasury/vesting
// address set or lock-status registry, so treating unknown holders as
// circulating would be an unsupported claim.
const TOKEN_ADDRESS = "0xA61aA3460561A91A7402A3F32413e7253fE75bDa";
const CHAIN_ID = "0x89";
const RPC_URLS = [
  typeof process !== "undefined" ? process.env.POLYGON_RPC_URL : undefined,
  "https://polygon-bor-rpc.publicnode.com",
  "https://polygon-rpc.com",
].filter((url): url is string => typeof url === "string" && /^https:\/\//i.test(url));

function unavailable(): Response {
  return new Response(null, {
    status: 503,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-content-type-options": "nosniff",
    },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") return unavailable();

  // Keep the endpoint safe if it is later enabled: refuse to publish unless
  // the official Polygon deployment is reachable and verified by chain ID.
  // No numeric result is returned until verified exclusions are configured.
  try {
    const url = [...new Set(RPC_URLS)][0];
    if (!url) return unavailable();
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_chainId",
        params: [],
      }),
    });
    const payload = await response.json() as { result?: string };
    if (!response.ok || payload.result?.toLowerCase() !== CHAIN_ID || !TOKEN_ADDRESS) return unavailable();
  } catch (error) {
    console.error("circulating-supply unavailable", error);
  }
  return unavailable();
}
