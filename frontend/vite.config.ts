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
          const normalizedId = id.replace(/\\/g, "/");

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

          if (
            normalizedId.includes("/src/components/Charts/SurvivalChart.tsx") ||
            normalizedId.includes("/src/components/Charts/FanChart.tsx") ||
            normalizedId.includes("/src/components/Charts/AssetBreakdownChart.tsx") ||
            normalizedId.includes("/src/components/Charts/CashflowStackChart.tsx")
          ) {
            return "analysis-charts";
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
