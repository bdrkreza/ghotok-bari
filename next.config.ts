import type { NextConfig } from "next";

// Every screen is behind a login and reads the ghotok's own data, so pages render per request.
// Cache Components (the template default) would need a Suspense boundary around each such read; it is left off.
const nextConfig: NextConfig = {
  // PGlite ships a WebAssembly build of Postgres that must load from node_modules, not from a bundle.
  serverExternalPackages: ["@electric-sql/pglite"],
  experimental: {
    // the biodata form carries up to five photos, each shrunk to about 200 KB in the browser; the default is 1 MB
    serverActions: { bodySizeLimit: "4mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        // The service worker: the browser must always pick up the newest copy.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
