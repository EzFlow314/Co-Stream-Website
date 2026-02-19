import { NextResponse } from "next/server";
import { getNodeTargetsFromEnv } from "@/lib/node-router";
import { mergeActiveIndexes, type ActiveRoomIndexRow } from "@/lib/discover-index";

export async function GET() {
  const nodes = getNodeTargetsFromEnv();
  const results = await Promise.all(nodes.map(async (node) => {
    try {
      const res = await fetch(`${node.url}/rooms/active-index`, { cache: "no-store", headers: { "x-room-node": node.id } });
      if (!res.ok) return [] as ActiveRoomIndexRow[];
      const json = await res.json() as { rooms?: ActiveRoomIndexRow[] };
      return (json.rooms || []).map((room) => ({ ...room, nodeId: node.id }));
    } catch {
      return [] as ActiveRoomIndexRow[];
    }
  }));

  return NextResponse.json({ ok: true, rooms: mergeActiveIndexes(results), nodeCount: nodes.length });
}
