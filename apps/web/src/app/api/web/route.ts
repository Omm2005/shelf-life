import { NextResponse } from "next/server";

import { lookupShelfLifeBatch, webLookupRequestSchema } from "@/lib/AgentTools/web";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = webLookupRequestSchema.parse(body);
    const results = await lookupShelfLifeBatch(parsed.groceryName, parsed.items);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Web shelf-life API error", error);
    return NextResponse.json(
      { error: "Failed to fetch shelf-life information." },
      { status: 500 },
    );
  }
}
