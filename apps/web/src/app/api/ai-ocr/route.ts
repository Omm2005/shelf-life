import { devToolsMiddleware } from "@ai-sdk/devtools";
import { google } from "@ai-sdk/google";
import { stepCountIs, streamText, wrapLanguageModel } from "ai";

import { createAgentTools, type WorkflowEvent } from "@/lib/AgentTools";

export const runtime = "nodejs";
export const maxDuration = 60;

const encodeLine = (payload: unknown) => `${JSON.stringify(payload)}\n`;

export async function POST(req: Request) {
  const formData = await req.formData();
  const image = formData.get("image");

  if (!(image instanceof File)) {
    return new Response(encodeLine({ type: "error", error: "Missing image file in 'image' field." }), {
      status: 400,
      headers: { "content-type": "application/x-ndjson; charset=utf-8" },
    });
  }

  const bytes = await image.arrayBuffer();
  const imageBuffer = Buffer.from(bytes);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (payload: WorkflowEvent) => controller.enqueue(encoder.encode(encodeLine(payload)));

      try {
        send({ type: "stage", stage: "queued", message: "Starting AI OCR workflow" });

        const model = wrapLanguageModel({
          model: google("gemini-2.5-flash"),
          middleware: devToolsMiddleware(),
        });

        const { tools, getState, buildFallbackFinalOutput } = createAgentTools({
          imageBuffer,
          send,
        });

        const result = streamText({
          model,
          stopWhen: stepCountIs(6),
          prepareStep: ({ stepNumber }) => {
            if (stepNumber === 0) {
              return {
                activeTools: ["runOCR"],
                toolChoice: { type: "tool" as const, toolName: "runOCR" },
              };
            }

            if (stepNumber === 1) {
              return {
                activeTools: ["submitReceipt"],
                toolChoice: { type: "tool" as const, toolName: "submitReceipt" },
              };
            }

            if (stepNumber === 2) {
              return {
                activeTools: ["webSearchShelfLife"],
                toolChoice: { type: "tool" as const, toolName: "webSearchShelfLife" },
              };
            }

            if (stepNumber === 3) {
              return {
                activeTools: ["submitFinalReceipt"],
                toolChoice: { type: "tool" as const, toolName: "submitFinalReceipt" },
              };
            }

            return {};
          },
          tools,
          prompt: [
            "You are a receipt extraction workflow agent.",
            "Follow this exact order:",
            "1) call runOCR",
            "2) call submitReceipt with parsed receipt fields",
            "3) call webSearchShelfLife",
            "4) call submitFinalReceipt with all item details and shelfLife fields and sources[]",
            "Do not skip steps.",
            "Only keep grocery/food items. If an item is not grocery, do not include it in output JSON.",
            "Required receipt shape:",
            '{"grceryName":"string","printedDate":"string","items":[{"printedName":"string","normalizePrintedName":"string","price":number?,"quantity":number?}]}',
            "Required final shape:",
            '{"grceryName":"string","printedDate":"string","items":[{"printedName":"string","normalizePrintedName":"string","price":number?,"quantity":number?,"shelfLifeText":"string","shelfLifeDays":number?,"query":string?,"sources":[{"title":"string","url":"https://...","favicon":"https://...","images":["https://..."],"description":"string","score":number?,"publishedDate":"string?"}]}]}',
          ].join("\n"),
        });

        for await (const textPart of result.textStream) {
          const chunk = textPart.trim();
          if (chunk) {
            send({ type: "llm", text: chunk });
          }
        }

        const { ocrText, receipt, finalOutput } = getState();
        const fallback = buildFallbackFinalOutput();

        if (!finalOutput) {
          if (!receipt || !fallback) {
            throw new Error("Model did not submit receipt output.");
          }
        }

        const finalData = finalOutput ?? fallback;
        if (!finalData) {
          throw new Error("Failed to build final receipt output.");
        }

        send({
          type: "final",
          data: finalData,
          ocrText,
        });

        controller.close();
      } catch (error) {
        console.error("AI OCR API error", error);
        send({
          type: "error",
          error: error instanceof Error ? error.message : "Failed to process AI OCR request.",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
