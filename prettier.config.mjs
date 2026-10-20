/** @type {import("prettier").Config} */
export default {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  plugins: ['@ianvs/prettier-plugin-sort-imports'],
  importOrder: ['<THIRD_PARTY_MODULES>', '', '^@/(.*)$', '', '^[.]'],
  importOrderParserPlugins: ['typescript', 'jsx'],
};
