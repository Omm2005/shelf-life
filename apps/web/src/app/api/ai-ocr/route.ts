import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import z from 'zod';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Define the exact schema structure
const groceryItemSchema = z.object({
  printedProductName: z.string().describe('The exact product name as printed on the receipt'),
  commonProductName: z.string().describe('A normalized/common name for the product'),
  price: z.number().describe('Price of the item'),
  quantity: z.number().describe('The quantity purchased')
});

const receiptSchema = z.object({
  merchant: z.string().describe('Name of the store/merchant'),
  printedDate: z.string().describe('Date as printed on the receipt'),
  items: z.array(groceryItemSchema).describe('List of all grocery items from the receipt')
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const ocrText = typeof body?.ocrText === 'string' ? body.ocrText.trim() : '';

    if (!ocrText) {
      return NextResponse.json(
        { error: 'No OCR text provided' },
        { status: 400 }
      );
    }

    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: receiptSchema,
      messages: [
        {
          role: 'user',
          content: `Extract all grocery items from this receipt.

OCR Text from Receipt:
${ocrText}

Instructions:
- Extract the merchant/store name
- Extract the date as it appears on the receipt
- For each item:
  * printedProductName: Extract the exact product name as shown on receipt (e.g., "ORG BANANAS", "2% MILK GAL")
  * commonProductName: Provide a clean, readable version (e.g., "Organic Bananas", "2% Milk Gallon")
  * price: The item price as a number
  * quantity: The quantity purchased (default to 1 if not specified)
- Include all items from the receipt
- If the item is repeated than add the quantity instead of listing it multiple times
`
        }
      ],
    });

    console.log({
      success: true,
      data: object,
      metadata: {
        itemCount: object.items.length
      }
    });
    return NextResponse.json({
      success: true,
      data: object,
      metadata: {
        itemCount: object.items.length
      }
    });

  } catch (error) {
    console.error('OCR processing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process receipt', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
