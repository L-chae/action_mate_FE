// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,

  // ✅ @/* path alias를 ESLint(import/no-unresolved)가 이해하게 함
  {
    settings: {
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
        },
      },
    },
  },

  {
    ignores: ["dist/*"],
  },
]);
