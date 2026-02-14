import fs from "node:fs";
import path from "node:path";

import { createWorker } from "tesseract.js";

const WORKER_RELATIVE_PATH = path.join(
  "node_modules",
  "tesseract.js",
  "src",
  "worker-script",
  "node",
  "index.js",
);

const getNodeWorkerPath = () => {
  const candidates = [
    path.resolve(process.cwd(), WORKER_RELATIVE_PATH),
    path.resolve(process.cwd(), "..", WORKER_RELATIVE_PATH),
    path.resolve(process.cwd(), "..", "..", WORKER_RELATIVE_PATH),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error("Unable to locate tesseract node worker script on disk.");
};

const convertor = async (img: string | Buffer) => {
  const worker = await createWorker("eng", 1, {
    workerPath: getNodeWorkerPath(),
  });

  try {
    const ret = await worker.recognize(img);
    return ret.data.text;
  } finally {
    await worker.terminate();
  }
};

export default convertor;
