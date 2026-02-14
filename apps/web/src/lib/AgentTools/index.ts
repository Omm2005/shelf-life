import { tool } from "ai";
import { z } from "zod";

import {
  groceryReceiptSchema,
  groceryReceiptWithShelfSchema,
  type GroceryReceipt,
  type GroceryReceiptWithShelf,
} from "@/lib/ai-ocr-schema";
import convertor from "@/lib/convertor";
import { lookupShelfLifeBatch } from "@/lib/AgentTools/web";

export type WorkflowEvent =
  | { type: "stage"; stage: string; message: string }
  | { type: "item_status"; item: string; status: "loading" | "done" | "error"; shelfLifeDays?: number }
  | { type: "llm"; text: string }
  | { type: "final"; data: GroceryReceiptWithShelf; ocrText: string }
  | { type: "error"; error: string };

type WebResult = {
  normalizedProductName: string;
  shelfLife: string;
  shelfLifeDays?: number;
  query: string;
  sources: Array<{
    title: string;
    url: string;
    favicon?: string | null;
    images?: string[];
    description?: string;
    score?: number;
    publishedDate?: string | null;
  }>;
};

type Params = {
  imageBuffer: Buffer;
  send: (event: WorkflowEvent) => void;
};

export const normalizeProductName = (input: string) =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();


const mergeWithShelfLife = (
  receipt: GroceryReceipt,
  shelfByName: Map<
    string,
    {
      shelfLife: string;
      shelfLifeDays?: number;
      query: string;
      sources: WebResult["sources"];
    }
  >,
): GroceryReceiptWithShelf => {
  return groceryReceiptWithShelfSchema.parse({
    ...receipt,
    items: receipt.items.map((item) => {
      const key = normalizeProductName(item.normalizePrintedName || item.printedName);
      const match = shelfByName.get(key);

      return {
        ...item,
        normalizePrintedName: key,
        shelfLifeText: match?.shelfLife ?? "",
        shelfLifeDays: match?.shelfLifeDays,
        query: match?.query,
        sources: match?.sources ?? [],
      };
    }),
  });
};

export const createAgentTools = ({ imageBuffer, send }: Params) => {
  let ocrText = "";
  let receipt: GroceryReceipt | null = null;
  let finalOutput: GroceryReceiptWithShelf | null = null;

  const shelfByName = new Map<
    string,
    {
      shelfLife: string;
      shelfLifeDays?: number;
      query: string;
      sources: WebResult["sources"];
    }
  >();

  const tools = {
    runOCR: tool({
      description: "Run OCR on the uploaded receipt image and return raw detected text.",
      inputSchema: z.object({}),
      execute: async () => {
        send({ type: "stage", stage: "ocr", message: "Running OCR" });
        ocrText = await convertor(imageBuffer);
        send({ type: "stage", stage: "ocr_done", message: "OCR completed" });
        return { ocrText };
      },
    }),
    submitReceipt: tool({
      description: "Submit extracted grocery receipt JSON using the receipt schema after OCR.",
      inputSchema: groceryReceiptSchema,
      execute: async (input) => {
                receipt = groceryReceiptSchema.parse({
          ...input,
          items: input.items.map((item) => ({
            ...item,
            normalizePrintedName: normalizeProductName(item.normalizePrintedName || item.printedName),
          })),
        });
        
        send({
          type: "stage",
          stage: "receipt_done",
          message: `Parsed ${receipt.items.length} grocery items`,
        });

        for (const item of receipt.items) {
          send({ type: "item_status", item: item.normalizePrintedName, status: "loading" });
        }

        return { accepted: true, items: receipt.items.length };
      },
    }),
    webSearchShelfLife: tool({
      description: "Use /api/web to fetch shelf-life data for all normalized products.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!receipt) {
          throw new Error("Receipt must be submitted before web search.");
        }

        send({ type: "stage", stage: "web", message: "Running web shelf-life search" });

        const results = await lookupShelfLifeBatch(
          receipt?.grceryName || "grocery store",
          receipt.items.map((item) => ({
            normalizeProductName: item.normalizePrintedName,
            printedName: item.printedName,
          })),
        );

        for (const row of results) {
          const itemName = normalizeProductName(row.normalizeProductName);

          if (!row) {
            send({ type: "item_status", item: itemName, status: "error" });
            continue;
          }

          shelfByName.set(row.normalizedProductName, {
            shelfLife: row.shelfLife,
            shelfLifeDays: row.shelfLifeDays,
            query: row.query,
            sources: row.sources ?? [],
          });

          send({
            type: "item_status",
            item: itemName,
            status: "done",
            shelfLifeDays: row.shelfLifeDays,
          });
        }

        send({ type: "stage", stage: "web_done", message: "Web shelf-life search completed" });
        return { lookedUp: shelfByName.size };
      },
    }),
    submitFinalReceipt: tool({
      description:
        "Submit final receipt JSON that includes shelfLifeText, shelfLifeDays, and sources[] per item.",
      inputSchema: groceryReceiptWithShelfSchema,
      execute: async (input) => {
         finalOutput = groceryReceiptWithShelfSchema.parse(input);
        send({ type: "stage", stage: "final_done", message: "Final structured output ready" });
        return { accepted: true };
      },
    }),
  };

  return {
    tools,
    getState: () => ({ ocrText, receipt, finalOutput, shelfByName }),
    buildFallbackFinalOutput: () => (receipt ? mergeWithShelfLife(receipt, shelfByName) : null),
  };
};
