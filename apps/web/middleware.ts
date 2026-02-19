import { NextRequest, NextResponse } from "next/server";

const hits = new Map<string, { count: number; ts: number }>();

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/join/")) return NextResponse.next();

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now - entry.ts > 60_000) {
    hits.set(ip, { count: 1, ts: now });
    return NextResponse.next();
  }

  if (entry.count >= 40) {
    return new NextResponse("Too many join attempts", { status: 429 });
  }

  entry.count += 1;
  return NextResponse.next();
}

export const config = {
  matcher: ["/join/:path*"]
};
