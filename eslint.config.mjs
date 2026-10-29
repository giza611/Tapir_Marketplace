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
    // Separate package with its own TypeScript config and Node-flavoured
    // code; linting it with the Next rules here reports nothing useful.
    // Checked by `npm run typecheck` inside mcp/.
    "mcp/**",
  ]),
]);

export default eslintConfig;
