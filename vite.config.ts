import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Keep the existing REACT_APP_* variable and secret names working.
  envPrefix: ["VITE_", "REACT_APP_"],
  build: {
    // Same output folder the deploy workflow publishes.
    outDir: "build",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.ts",
  },
});
