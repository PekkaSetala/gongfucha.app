import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // @vercel/nft traces onnxruntime_binding.node for /api/identify but misses
  // its dynamically loaded libonnxruntime.so.1 sibling. Force-include the
  // Linux napi binaries so the standalone image can run the embedder.
  outputFileTracingIncludes: {
    "/api/identify": ["node_modules/onnxruntime-node/bin/napi-v6/linux/**"],
  },
};

export default nextConfig;
