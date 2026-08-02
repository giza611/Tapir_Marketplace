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
    // Design handoff export: reference material we read, not code we ship.
    // It is third-party generated and lints with errors that are not ours to fix.
    "Tapir Scripts Marketplace/**",
    "docs/design/**",
  ]),
]);

export default eslintConfig;
