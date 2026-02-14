import { z } from "zod";

const sourceSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  favicon: z.string().url().nullable().optional(),
  images: z.array(z.string().url()).default([]),
  description: z.string().default(""),
  score: z.number().optional(),
  publishedDate: z.string().nullable().optional(),
});

const receiptItemSchema = z.object({
  printedName: z.string().describe("The exact text detected by OCR for the item name"),
  normalizePrintedName: z.string().describe("Normalized product name"),
  price: z.number().optional(),
  quantity: z.number().optional(),
});

export const groceryReceiptSchema = z.object({
  grceryName: z.string(),
  printedDate: z.string(),
  items: z.array(receiptItemSchema),
});

export type GroceryReceipt = z.infer<typeof groceryReceiptSchema>;

export const groceryReceiptWithShelfSchema = z.object({
  grceryName: z.string(),
  printedDate: z.string(),
  items: z.array(
    receiptItemSchema.extend({
      shelfLifeText: z.string(),
      shelfLifeDays: z.number().optional(),
      query: z.string().optional(),
      sources: z.array(sourceSchema).default([]),
    }),
  ),
});

export type GroceryReceiptWithShelf = z.infer<typeof groceryReceiptWithShelfSchema>;
