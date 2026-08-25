/* Жёсткий ESLint: синтаксис, импорты, сложность, безопасность */
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: ["eslint:recommended", "plugin:import/recommended", "plugin:promise/recommended"],
  parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  rules: {
    "no-undef": "error", "no-unreachable": "error", "no-dupe-keys": "error",
    "no-var": "error", "prefer-const": "error", "eqeqeq": ["error", "always"],
    "no-eval": "error", "no-implied-eval": "error",
    "import/no-unresolved": "error", "import/no-cycle": "error", "import/no-duplicates": "error",
    "complexity": ["error", 12], "max-depth": ["error", 4], "max-nested-callbacks": ["error", 3],
    "promise/catch-or-return": "error",
  },
};
