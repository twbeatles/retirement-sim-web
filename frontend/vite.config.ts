import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// NOTE: Do not add manualChunks groupings here.
// Vite 8 (Rolldown) emits <link rel="modulepreload"> for every manual
// chunk reachable from the entry - even when reached only through
// React.lazy/dynamic import - which pulls heavy chart/vendor bytes back
// into the initial load measured by perf:gate:hard. Default
// code-splitting already isolates the lazy boundaries (charts, layouts,
// worker client), so the entry stays within budget without forced groups.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
} as any); // Type cast until @types/vitest are loaded
