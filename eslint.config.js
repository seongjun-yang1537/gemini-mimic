const js = require("@eslint/js");

module.exports = [
  {
    ignores: ["node_modules/**", "outputs/**", "uploads/**", "assets/**", "taurus/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        console: "readonly",
        process: "readonly",
        module: "readonly",
        require: "readonly",
        __dirname: "readonly",
        fetch: "readonly",
        URLSearchParams: "readonly",
        URL: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        AbortController: "readonly",
      },
    },
    rules: {
      "no-empty": ["error", { allowEmptyCatch: true }],
      "preserve-caught-error": "off",
    },
  },
];
