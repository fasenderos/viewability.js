/// <reference types="vitest/config" />
import { coverageConfigDefaults, defineConfig } from "vitest/config";
import dts from "vite-plugin-dts";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/main.ts"),
      formats: ["es", "cjs", "iife"],
      name: "Viewability",
      fileName: (format) => `viewability.${format}.js`,
    },
    rollupOptions: {
      output: [
        {
          format: "es", // ESM: per compatibilità con framework moderni
          entryFileNames: "viewability.es.js",
        },
        {
          format: "cjs", // CJS: per compatibilità con Node.js o sistemi legacy
          entryFileNames: "viewability.cjs.js",
        },
        {
          format: "iife", // IIFE: per compatibilità nei browser
          entryFileNames: "viewability.iife.js",
          extend: true, // Non sovrascrivere window.Viewability
          esModule: false, // Disabilita ESM per compatibilità con script globali
          name: "Viewability", // Questo è il nome globale per il formato IIFE
        },
      ],
    },
  },
  publicDir: false,
  plugins: [dts({ rollupTypes: true })],
  test: {
    environment: "jsdom", // simulate browser
    coverage: {
      // https://vitest.dev/config/#coverage-exclude
      exclude: ["src/main.ts", ...coverageConfigDefaults.exclude],
      reporter: ["text", "lcov"],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
