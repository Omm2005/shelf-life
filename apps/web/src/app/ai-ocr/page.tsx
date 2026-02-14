"use client";

import { createWorker } from "tesseract.js";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";

type GroceryItem = {
  printedProductName: string;
  commonProductName: string;
  price: number;
  quantity: number;
};

type ReceiptResponse = {
  success: boolean;
  data: {
    merchant: string;
    printedDate: string;
    items: GroceryItem[];
  };
  metadata: {
    itemCount: number;
  };
};

export default function AIOCRPage() {
  const [processing, setProcessing] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [error, setError] = useState("");
  const [workflowStage, setWorkflowStage] = useState("Idle");
  const [data, setData] = useState<ReceiptResponse["data"] | null>(null);

  const handleFile = async (file: File) => {
    setProcessing(true);
    setError("");
    setData(null);
    setOcrText("");
    setWorkflowStage("Running OCR in browser");

    let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

    try {
      worker = await createWorker("eng");
      const {
        data: { text },
      } = await worker.recognize(file);

      const normalizedText = text.trim();
      if (!normalizedText) {
        throw new Error("No text detected in image");
      }

      setOcrText(normalizedText);
      setWorkflowStage("Sending OCR text to backend");

      const response = await fetch("/api/ai-ocr", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ ocrText: normalizedText }),
      });

      const payload = (await response.json()) as
        | ReceiptResponse
        | { error?: string; details?: string };

      if (!response.ok) {
        const message = "error" in payload
          ? payload.error || payload.details || "Request failed"
          : "Request failed";
        throw new Error(message);
      }

      const successPayload = payload as ReceiptResponse;
      setData(successPayload.data);
      setWorkflowStage("Completed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setWorkflowStage("Failed");
    } finally {
      if (worker) {
        await worker.terminate();
      }
      setProcessing(false);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl p-4 space-y-4">
      <h1 className="text-2xl font-semibold">AI OCR + Shelf Life</h1>
      <p className="text-sm text-muted-foreground">
        OCR runs in the browser, then extracted text is sent to the backend for AI parsing.
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
          Processing...
        </div>
      ) : null}

      {error ? <p className="text-red-500">{error}</p> : null}

      <section className="space-y-2">
        <h2 className="font-medium">Parsed Receipt JSON</h2>
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
