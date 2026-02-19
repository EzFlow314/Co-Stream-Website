import { ErrorCode } from "@ezplay/contracts";

export type NodeId = "A" | "B";

export type NodeTarget = {
  id: NodeId;
  url: string;
};

const ROOM_CODE_FALLBACK_LENGTH = 6;

export function roomHash(roomCode: string): number {
  let hash = 0;
  for (const ch of roomCode.toUpperCase()) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return hash;
}

export function selectNode(roomCode: string, nodes: NodeTarget[]): NodeTarget {
  if (!nodes.length) throw new Error("No WS nodes configured");
  return nodes[roomHash(roomCode) % nodes.length]!;
}

export function getNodeTargetsFromEnv(env: NodeJS.ProcessEnv = process.env): NodeTarget[] {
  const dual = [
    { id: "A" as const, url: env.WS_NODE_A_URL },
    { id: "B" as const, url: env.WS_NODE_B_URL }
  ].filter((n) => typeof n.url === "string" && n.url.length > 0);
  if (dual.length) return dual.map((n) => ({ id: n.id, url: String(n.url) }));
  return [{ id: "A", url: env.WS_HTTP_URL || "http://localhost:4001" }];
}

export function getNodeById(nodes: NodeTarget[], id: string | undefined): NodeTarget | null {
  if (!id) return null;
  return nodes.find((node) => node.id === id) ?? null;
}

export async function fetchWithMismatchRetry(path: string, roomCode: string): Promise<{ res: Response; node: NodeTarget }> {
  const nodes = getNodeTargetsFromEnv();
  const primary = selectNode(roomCode, nodes);
  const tryFetch = async (node: NodeTarget) => fetch(`${node.url}${path}`, { cache: "no-store", headers: { "x-room-node": node.id } });

  let res: Response;
  try {
    res = await tryFetch(primary);
  } catch {
    const alternate = nodes.find((x) => x.id !== primary.id);
    if (!alternate) throw new Error(ErrorCode.NODE_UNAVAILABLE);
    return { res: await tryFetch(alternate), node: alternate };
  }

  if (res.status !== 409) return { res, node: primary };
  const mismatch = await res.clone().json().catch(() => null) as { code?: string; expectedNode?: string } | null;
  if (mismatch?.code !== ErrorCode.ROOM_NODE_MISMATCH) return { res, node: primary };
  const expectedNode = getNodeById(nodes, mismatch.expectedNode);
  if (!expectedNode || expectedNode.id === primary.id) return { res, node: primary };
  return { res: await tryFetch(expectedNode), node: expectedNode };
}

export function createDeterministicRoomCode(seed = Date.now()): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = Math.abs(seed) >>> 0;
  let code = "";
  for (let i = 0; i < ROOM_CODE_FALLBACK_LENGTH; i += 1) {
    code += alphabet[value % alphabet.length];
    value = (Math.floor(value / alphabet.length) ^ (i * 7919)) >>> 0;
  }
  return code;
}
