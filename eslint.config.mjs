import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Archivos de pdf.js copiados por scripts/copiar-pdfjs.mjs:
    "public/pdfjs/**",
    // La parte de análisis es Python (y su entorno virtual trae JS ajeno):
    "analysis/**",
  ]),
]);

export default eslintConfig;
