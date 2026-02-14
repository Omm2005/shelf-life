import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const getTesseractNodeWorkerPath = () =>
  require.resolve("tesseract.js/src/worker-script/node/index.js");

