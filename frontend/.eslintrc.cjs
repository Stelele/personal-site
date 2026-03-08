module.exports = {
  root: true,
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:vue/recommended",
  ],
  parser: "vue-eslint-parser",
  parserOptions: {
    parser: "@typescript-eslint/parser",
    ecmaVersion: "latest",
    sourceType: "module",
  },
  globals: {
    defineShortcuts: "readonly",
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
    "vue/no-v-html": "warn",
    "vue/no-v-model-argument": "off",
    "vue/multi-word-component-names": "off",
    "vue/html-indent": "off",
    "vue/max-attributes-per-line": "off",
    "vue/html-closing-bracket-newline": "off",
  },
  overrides: [
    {
      files: ["src/pages/blog/Blog.vue"],
      rules: {
        "vue/no-v-html": "off",
      },
    },
  ],
};
