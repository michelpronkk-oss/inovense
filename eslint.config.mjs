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
    ".trigger/**",
    "videos-ino/build/**",
    "videos-ino/out/**",
    "social-assets/dist/**",
    "social-assets/build/**",
    "design_handoff_inovense/**",
    "public/design/**",
  ]),
]);

export default eslintConfig;
