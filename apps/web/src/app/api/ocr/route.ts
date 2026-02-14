import { NextResponse } from "next/server";

import convertor from "@/lib/convertor";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: "Missing image file in 'image' field." },
        { status: 400 },
      );
    }

    const bytes = await image.arrayBuffer();
    const text = await convertor(Buffer.from(bytes));

    return NextResponse.json({ text });
  } catch (error) {
    console.error("OCR API error", error);
    return NextResponse.json(
      { error: "Failed to process OCR request." },
      { status: 500 },
    );
  }
}
