// Flat config. ESLint 10 ignores .eslintrc entirely, which is why `npm run
// lint` was failing outright rather than reporting anything.
//
// This is a faithful port of the old .eslintrc.cjs: the same extends chain, the
// same parser pairing, the same rules, and the same single override. Rule
// severities are unchanged on purpose - this fixes the toolchain, it is not an
// opportunity to change what the project considers a warning.
import js from "@eslint/js";
import globals from "globals";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import vuePlugin from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";

export default [
  {
    ignores: ["dist/**", "node_modules/**", "out/**"],
  },
  js.configs.recommended,
  ...vuePlugin.configs["flat/recommended"],
  // This entry is itself an array in @typescript-eslint 8, so it is spread
  // rather than nested - a nested array is rejected by the config loader.
  ...tsPlugin.configs["flat/recommended"],
  {
    files: ["**/*.{ts,vue}"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        defineShortcuts: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
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
  },
  {
    // Both render CMS-authored markdown through usePostRenderer, which runs the
    // HTML through DOMPurify before returning it. The inline disable comment
    // these views carried did not work: it sits several lines above the v-html
    // attribute, and eslint-disable-next-line only covers the following line.
    files: ["src/pages/blog/Blog.vue", "src/pages/projects/ProjectView.vue"],
    rules: {
      "vue/no-v-html": "off",
    },
  },
];
