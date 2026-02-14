import { z } from "zod";

import { env } from "@shelf-life/env/server";

export const webLookupRequestSchema = z.object({
  groceryName: z.string().min(1),
  items: z.array(
    z.object({
      normalizeProductName: z.string().min(1),
      printedName: z.string().optional(),
    }),
  ),
});

type TavilyResult = {
  answer?: string;
  images?: string[];
  results?: Array<{
    url?: string;
    title?: string;
    content?: string;
    raw_content?: string;
    favicon?: string;
    score?: number;
    published_date?: string;
    images?: string[];
  }>;
};

export const normalizeProductName = (input: string) =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractShelfLifeDays = (text: string): number | undefined => {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(day|days|week|weeks|month|months|year|years)/i);
  if (!match) return undefined;

  const value = Number.parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (Number.isNaN(value)) return undefined;

  if (unit.startsWith("day")) return Math.round(value);
  if (unit.startsWith("week")) return Math.round(value * 7);
  if (unit.startsWith("month")) return Math.round(value * 30);
  if (unit.startsWith("year")) return Math.round(value * 365);
  return undefined;
};

const searchShelfLife = async (groceryName: string, inputName: string) => {
  if (!env.TAVILY_API_KEY) {
    throw new Error("Missing TAVILY_API_KEY in server environment.");
  }

  const normalizedName = normalizeProductName(inputName);
  const query = `What is the shelf life ${normalizedName} from ${groceryName}?`;

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      api_key: env.TAVILY_API_KEY,
      query,
      include_answer: "basic",
      search_depth: "advanced",
      include_favicon: true,
      include_images: true,
      max_results: 5,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily request failed (${response.status})`);
  }

  const payload = (await response.json()) as TavilyResult;
  const answer = payload.answer ?? "";
  const first = payload.results?.[0];
  const shelfLife = answer || first?.content || "";
  const sharedImages = Array.isArray(payload.images) ? payload.images : [];

  const sources = (payload.results ?? [])
    .map((row) => ({
      title: row.title || row.url || "Untitled source",
      url: row.url ?? "",
      favicon: row.favicon ?? null,
      images: Array.isArray(row.images) && row.images.length ? row.images : sharedImages,
      description: row.content || row.raw_content || "",
      score: row.score,
      publishedDate: row.published_date ?? null,
    }))
    .filter((row) => row.url);

  return {
    query,
    normalizedProductName: normalizedName,
    shelfLife,
    shelfLifeDays: extractShelfLifeDays(shelfLife),
    sources,
  };
};

export const lookupShelfLifeBatch = async (
  groceryName: string,
  items: Array<{ normalizeProductName: string; printedName?: string }>,
) => {
  return Promise.all(
    items.map(async (item) => {
      const result = await searchShelfLife(groceryName, item.normalizeProductName);
      return {
        normalizeProductName: item.normalizeProductName,
        printedName: item.printedName ?? item.normalizeProductName,
        ...result,
      };
    }),
  );
};
