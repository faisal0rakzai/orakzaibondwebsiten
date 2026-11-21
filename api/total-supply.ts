/// <reference lib="dom" />

declare const process: { env: Record<string, string | undefined> };

type RpcResponse = {
  result?: string;
  error?: { code?: number; message?: string };
};

export const config = { runtime: "edge" };

const CHAIN_ID = "0x89"; // Polygon Mainnet (137)
const TOKEN_ADDRESS = "0xA61aA3460561A91A7402A3F32413e7253fE75bDa";
const DECIMALS_SELECTOR = "0x313ce567";
const TOTAL_SUPPLY_SELECTOR = "0x18160ddd";
const DEFAULT_RPC_URLS = [
  "https://polygon-bor-rpc.publicnode.com",
  "https://polygon-rpc.com",
];
const RPC_TIMEOUT_MS = 7000;

function rpcUrls(): string[] {
  const configured = typeof process !== "undefined" ? process.env.POLYGON_RPC_URL : undefined;
  const values: string[] = configured
    ? configured.split(",").map((url) => url.trim()).filter(Boolean)
    : DEFAULT_RPC_URLS;
  return [...new Set(values)].filter((url) => /^https:\/\//i.test(url));
}

async function rpcCall(url: string, method: string, params: unknown[]): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`rpc_http_${response.status}`);
    const payload = await response.json() as RpcResponse;
    if (payload.error || typeof payload.result !== "string") throw new Error("rpc_invalid_response");
    return payload.result;
  } finally {
    clearTimeout(timeout);
  }
}

function decodeUint256(value: string): bigint {
  if (!/^0x[0-9a-f]+$/i.test(value)) throw new Error("invalid_uint256");
  return BigInt(value);
}

function formatUnits(value: bigint, decimals: number): string {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) throw new Error("invalid_decimals");
  if (decimals === 0) return value.toString();
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = (value % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function plain(status: number, body = ""): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=30, s-maxage=30, stale-while-revalidate=60",
      "x-content-type-options": "nosniff",
    },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") return plain(405);

  const callParams = [{ to: TOKEN_ADDRESS, data: TOTAL_SUPPLY_SELECTOR }, "latest"];
  const decimalsParams = [{ to: TOKEN_ADDRESS, data: DECIMALS_SELECTOR }, "latest"];

  for (const url of rpcUrls()) {
    try {
      const chainId = await rpcCall(url, "eth_chainId", []);
      if (chainId.toLowerCase() !== CHAIN_ID) continue;
      const [rawSupply, rawDecimals] = await Promise.all([
        rpcCall(url, "eth_call", callParams),
        rpcCall(url, "eth_call", decimalsParams),
      ]);
      const supply = formatUnits(decodeUint256(rawSupply), Number(decodeUint256(rawDecimals)));
      if (!/^\d+(?:\.\d+)?$/.test(supply)) throw new Error("invalid_supply_format");
      return plain(200, supply);
    } catch (error) {
      console.error("total-supply RPC attempt failed", error);
    }
  }

  return plain(503);
}
