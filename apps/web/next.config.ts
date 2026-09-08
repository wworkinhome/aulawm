import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @aulawm/tokens ships raw TS/JSON (no build step — see packages/tokens);
  // @aulawm/shared ships compiled JS but Next still needs to know to resolve
  // it as workspace source rather than a pre-bundled dependency.
  transpilePackages: ["@aulawm/tokens", "@aulawm/shared"],
};

export default nextConfig;
