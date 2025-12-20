import js from "@eslint/js";
import tseslint from "typescript-eslint";
import * as figmaPlugin from "@figma/eslint-plugin-figma-plugins";
import { defineConfig } from "eslint/config";

export default defineConfig(
  {
    // config with just ignores is the replacement for `.eslintignore`
    ignores: ["**/node_modules", "**/dist/**"],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  figmaPlugin.flatConfigs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      // :TODO: Disable rules that are to-be-fixed later
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "prefer-const": "off",
      "no-useless-catch": "off",
    },
  }
);
