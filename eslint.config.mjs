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
    // Legacy static app files are preserved for reference/legal pages, but
    // Render now runs the Next app.
    "app.js",
    "login.js",
    "server.js",
    "public/app.js",
    "public/login.js",
    "src/worker.js",
  ]),
]);

export default eslintConfig;
