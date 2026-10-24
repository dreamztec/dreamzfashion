import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    projects: [
      { test: { name: "server", include: ["tests/**/*.test.ts"], environment: "node" } },
      {
        resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
        test: { name: "auth-ui", include: ["tests/**/*.test.tsx"], environment: "jsdom", environmentOptions: { jsdom: { url: "https://dreamzfashion.dreamz-gc.com" } } },
      },
    ],
  },
});
