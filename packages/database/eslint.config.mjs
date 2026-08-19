import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["coverage/**", "drizzle/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "drizzle.config.ts", "vitest.*.mts"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
);
