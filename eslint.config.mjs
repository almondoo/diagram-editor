// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  // ベースルール
  eslint.configs.recommended,
  tseslint.configs.recommended,

  // _プレフィックス変数を未使用チェック対象から除外 (全ファイル共通)
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  // React / React Hooks ルール (TSX ファイルのみ)
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // React 17+ では不要
      "react/prop-types": "off", // TypeScript で型安全のため不要
    },
    settings: {
      react: { version: "detect" },
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
  },

  // 非 JSX TypeScript ファイル (core/react packages など)
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
  },

  // 除外パターン
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.react-router/**",
      "**/build/**",
      ".pnpm-store/**",
    ],
  },
);
