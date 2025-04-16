import { defineConfig } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";
import promise from "eslint-plugin-promise";

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs}"] },
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: { ...globals.node }, // Only include Node.js globals
    },
    plugins: { js, promise }, // Add the promise plugin
    extends: ["js/recommended"], // Extend recommended rules
    rules: {
      // Add rules for async and Promises
      "require-await": "error", // Disallow async functions without await
      "promise/catch-or-return": "error", // Ensure Promises have a catch or return
      "promise/always-return": "error", // Ensure Promises always return a value
      "promise/no-return-wrap": "error", // Disallow wrapping values in Promise.resolve or Promise.reject unnecessarily
      "promise/no-nesting": "warn", // Warn against nesting Promises
      "promise/no-promise-in-callback": "warn", // Warn against using Promises inside callbacks
      "promise/no-callback-in-promise": "warn", // Warn against using callbacks inside Promises
    },
  },
]);
