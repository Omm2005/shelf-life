import "@shelf-life/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  transpilePackages: ["shiki"],
  serverExternalPackages: ["tesseract.js", "tesseract.js-core"],
};

export default nextConfig;
