// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

const importPlugin = require("eslint-plugin-import");

module.exports = defineConfig([
  expoConfig,

  // ✅ import 플러그인 등록 + typescript resolver 설정(@/* alias 인식)
  {
    plugins: {
      import: importPlugin,
    },
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
