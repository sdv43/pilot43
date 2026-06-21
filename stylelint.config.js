/** @type {import('stylelint').Config} */
export default {
  extends: ["stylelint-config-clean-order/error"],
  ignoreFiles: ["dist/**/*", "playwright-report/**/*", "test-results/**/*"],
  plugins: ["stylelint-no-unsupported-browser-features"],
  rules: {
    "plugin/no-unsupported-browser-features": [
      true,
      {
        browsers: ["last 2 Chrome versions"],
        ignorePartialSupport: true,
      },
    ],
  },
}
