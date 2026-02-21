import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules")) {
            if (
              id.includes("recharts") ||
              id.includes("victory-vendor") ||
              id.includes("d3-")
            ) {
              return "charts-vendor";
            }
            return "vendor";
          }
          if (id.includes("historicalData.ts") || id.includes("engine.ts")) {
            return "simulation-core";
          }
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
} as any); // Type cast until @types/vitest are loaded
