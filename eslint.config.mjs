// @ts-check
import { defineConfig } from "eslint/config";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

export default defineConfig(
  // ベースルール
  eslint.configs.recommended,
  tseslint.configs.recommended,

  // 全ファイル共通のベストプラクティス
  {
    rules: {
      // 未使用変数: _プレフィックスを除外
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],

      // 等値比較は厳密比較を使用
      eqeqeq: ["error", "always"],

      // var 禁止、const 推奨
      "no-var": "error",
      "prefer-const": "error",

      // 制御文のブレース (複数行の場合は必須)
      curly: ["error", "multi-line", "consistent"],

      // テンプレートリテラル推奨
      "prefer-template": "warn",

      // 不要な条件式
      "no-unneeded-ternary": "error",

      // オブジェクトのショートハンド推奨
      "object-shorthand": ["warn", "always"],

      // debugger 禁止 (recommended に含まれるが明示)
      "no-debugger": "error",

      // テンプレートリテラル内の ${} を通常文字列で使用した場合に警告
      "no-template-curly-in-string": "warn",

      // throw は Error オブジェクトのみ
      "no-throw-literal": "error",

      // 不要な return await
      "no-return-await": "error",

      // eval 禁止
      "no-eval": "error",

      // implied eval 禁止
      "no-implied-eval": "error",

      // スプレッド演算子推奨
      "prefer-spread": "warn",

      // rest パラメータ推奨 (arguments 禁止)
      "prefer-rest-params": "error",
    },
  },

  // TypeScript 固有のベストプラクティス
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // type import の一貫性
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],

      // 明示的 any は警告 (recommended のデフォルト)
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  // React / React Hooks ルール
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/self-closing-comp": "warn",
      "react/jsx-no-useless-fragment": "warn",
      "react/jsx-curly-brace-presence": [
        "warn",
        { props: "never", children: "never" },
      ],
    },
    settings: {
      react: { version: "19" },
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
  },

  // 非 JSX TypeScript ファイル
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
  },

  // テストファイルの緩和ルール
  {
    files: ["**/__tests__/**", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-throw-literal": "off",
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
      "e2e/**",
    ],
  },
);
