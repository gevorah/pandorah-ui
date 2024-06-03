/** @type {import("prettier").Config} */
export default {
  endOfLine: 'crlf',
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'none',
  plugins: [
    '@ianvs/prettier-plugin-sort-imports',
    'prettier-plugin-tailwindcss'
  ],
  importOrder: [
    '^(react/(.*)$)|^(react$)',
    '<THIRD_PARTY_MODULES>',
    '',
    '^@/lib/(.*)$',
    '^@/hooks/(.*)$',
    '^@/components/(.*)$',
    '',
    '^[.]'
  ],
  importOrderParserPlugins: ['typescript', 'jsx', 'decorators-legacy'],
  tailwindAttributes: ['class'],
  tailwindFunctions: ['cn', 'cva']
};

