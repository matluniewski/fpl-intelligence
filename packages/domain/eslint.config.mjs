import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["coverage/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-restricted-types": [
        "error",
        {
          types: {
            Date: "Pass UTC instants explicitly; domain behavior must not depend on the machine clock.",
          },
        },
      ],
    },
  },
);
