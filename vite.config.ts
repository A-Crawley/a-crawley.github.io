import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Keep the existing REACT_APP_* variable and secret names working.
  envPrefix: ["VITE_", "REACT_APP_"],
  build: {
    // Same output folder the deploy workflow publishes.
    outDir: "build",
    rollupOptions: {
      // The landing page, plus the game at /game/ (linked from the home page).
      input: {
        main: fileURLToPath(new URL("index.html", import.meta.url)),
        game: fileURLToPath(new URL("game/index.html", import.meta.url)),
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.ts",
    // Interaction tests render MUI and click many times; CI runners are slower than 5 s allows.
    testTimeout: 20_000,
  },
});
