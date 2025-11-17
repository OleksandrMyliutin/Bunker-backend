import globals from "globals";
import js from "@eslint/js";

export default [
  js.configs.recommended,

  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        console: "readonly"
      }
    },
    rules: {
      semi: "error",
      "no-unused-vars": ["error", { args: "none" }],
      "no-undef": "off"
    }
  }
];
