"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";

import type { GroceryReceiptWithShelf } from "@/lib/ai-ocr-schema";

type ItemStatus = "loading" | "done" | "error";

type StreamEvent =
  | { type: "stage"; stage: string; message: string }
  | { type: "item_status"; item: string; status: ItemStatus; shelfLifeDays?: number }
  | { type: "llm"; text: string }
  | { type: "final"; data: GroceryReceiptWithShelf; ocrText: string }
  | { type: "error"; error: string };

export default function AIOCRPage() {
  const [processing, setProcessing] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [data, setData] = useState<GroceryReceiptWithShelf | null>(null);
  const [error, setError] = useState("");
  const [workflowStage, setWorkflowStage] = useState("Idle");
  const [workflowLog, setWorkflowLog] = useState<string[]>([]);
  const [itemStatus, setItemStatus] = useState<Record<string, ItemStatus>>({});

  const appendLog = (message: string) => {
    setWorkflowLog((prev) => [...prev, message]);
  };

  const readStreamingResponse = async (response: Response) => {
    if (!response.body) {
      throw new Error("No response stream from /api/ai-ocr");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;

        const event = JSON.parse(line) as StreamEvent;

        if (event.type === "stage") {
          setWorkflowStage(event.message);
          appendLog(event.message);
        }

        if (event.type === "item_status") {
          setItemStatus((prev) => ({ ...prev, [event.item]: event.status }));
        }

        if (event.type === "llm") {
          appendLog(`AI: ${event.text}`);
        }

        if (event.type === "final") {
          setData(event.data);
          setOcrText(event.ocrText);
          setWorkflowStage("Completed");
          appendLog("Workflow completed");
        }

        if (event.type === "error") {
          setError(event.error);
          setWorkflowStage("Failed");
          appendLog(`Error: ${event.error}`);
        }
      }
    }
  };

  const handleFile = async (file: File) => {
    setProcessing(true);
    setError("");
    setData(null);
    setOcrText("");
    setWorkflowLog([]);
    setWorkflowStage("Uploading image");
    setItemStatus({});

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/ai-ocr", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Request failed");
      }

      await readStreamingResponse(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setWorkflowStage("Failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl p-4 space-y-4">
      <h1 className="text-2xl font-semibold">AI OCR + Shelf Life</h1>
      <p className="text-sm text-muted-foreground">
        OCR -&gt; AI extraction -&gt; web search tool -&gt; final JSON with shelf-life days.
      </p>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void handleFile(file);
          }
        }}
      />

      <div className="rounded border p-3">
        <p className="text-sm font-medium">Workflow Status</p>
        <p className="text-sm text-muted-foreground">{workflowStage}</p>
      </div>

      {processing ? (
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Processing stream...
        </div>
      ) : null}

      {error ? <p className="text-red-500">{error}</p> : null}

      <section className="space-y-2">
        <h2 className="font-medium">Items + Shelf Life</h2>
        <div className="rounded border divide-y">
          {data?.items?.length ? (
            data.items.map((item, index) => {
              const status = itemStatus[item.normalizePrintedName] ?? "loading";

              return (
                <div
                  key={`${item.normalizePrintedName}-${index}`}
                  className="flex items-start justify-between gap-4 p-3"
                >
                  <div>
                    <p className="font-medium">{item.normalizePrintedName}</p>
                    <p className="text-xs text-muted-foreground">Printed: {item.printedName}</p>
                    <p className="text-sm mt-2">{item.shelfLifeText || "No shelf-life answer"}</p>
                    {typeof item.shelfLifeDays === "number" ? (
                      <p className="text-xs text-muted-foreground">Shelf days: {item.shelfLifeDays}</p>
                    ) : null}
                    {item.sources?.length ? (
                      <div className="mt-2 space-y-1">
                        {item.sources.map((source) => (
                          <div key={source.url} className="text-xs text-muted-foreground">
                            <a href={source.url} target="_blank" rel="noreferrer" className="underline">
                              {source.title}
                            </a>
                            {source.favicon ? (
                              <img
                                src={source.favicon}
                                alt={source.title}
                                className="inline-block h-3 w-3 ml-1 align-middle"
                              />
                            ) : null}
                            {source.description ? (
                              <p className="line-clamp-2">{source.description}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="min-w-[140px] flex justify-end">
                    {status === "done" ? (
                      <span className="text-xs text-green-600 dark:text-green-400">Calculated</span>
                    ) : status === "error" ? (
                      <span className="text-xs text-red-500">Failed</span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Calculating...
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-3 text-sm text-muted-foreground">No products yet</div>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Workflow Log</h2>
        <pre className="rounded border p-3 text-xs overflow-auto max-h-56">
          {workflowLog.length ? workflowLog.join("\n") : "No workflow log yet"}
        </pre>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Final JSON</h2>
        <pre className="rounded border p-3 text-xs overflow-auto">
          {data ? JSON.stringify(data, null, 2) : "No output yet"}
        </pre>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">OCR Text</h2>
        <pre className="rounded border p-3 text-xs overflow-auto">{ocrText || "No OCR text yet"}</pre>
      </section>
    </div>
  );
}
