import { createWorker } from "tesseract.js";
import { getTesseractNodeWorkerPath } from "@/lib/tesseract";

const convertor = async (img: string | Buffer) => {
  const worker = await createWorker("eng", 1, {
    workerPath: getTesseractNodeWorkerPath(),
  });

  try {
    const ret = await worker.recognize(img);
    return ret.data.text;
  } finally {
    await worker.terminate();
  }
};

export default convertor;
