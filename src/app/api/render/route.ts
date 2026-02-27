import { NextRequest, NextResponse } from "next/server";

// ─── zrenderer Proxy ─────────────────────────────────────────────────
// Proxies render requests to zrenderer (self-hosted or VisualRag API).
// Keeps the access token server-side and provides a clean API.

const ZRENDERER_URL = process.env.ZRENDERER_URL || "http://localhost:11011";
const ZRENDERER_TOKEN = process.env.ZRENDERER_TOKEN || "";

export async function POST(req: NextRequest) {
  if (!ZRENDERER_TOKEN) {
    return NextResponse.json(
      { error: "ZRENDERER_TOKEN not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();

    // VisualRag API uses query param for token; self-hosted uses header
    const isVisualRag = ZRENDERER_URL.includes("ragnarok.wiki");
    const url = isVisualRag
      ? `${ZRENDERER_URL}/render?downloadimage&accesstoken=${ZRENDERER_TOKEN}`
      : `${ZRENDERER_URL}/render?downloadimage`;

    const headers: Record<string, string> = {
      "Content-Type": isVisualRag ? "application/vnd.api+json" : "application/json",
    };
    if (!isVisualRag) {
      headers["x-accesstoken"] = ZRENDERER_TOKEN;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `zrenderer error: ${res.status} ${text}` },
        { status: res.status }
      );
    }

    const imageBuffer = await res.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to render: ${message}` },
      { status: 502 }
    );
  }
}
