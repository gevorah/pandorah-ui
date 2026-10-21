import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import storybook from 'eslint-plugin-storybook';

export default [
  { ignores: ['**/dist/', '**/storybook-static/'] },
  js.configs.recommended,
  ...typescript.configs['flat/recommended'],
  reactHooks.configs.flat.recommended,
  ...storybook.configs['flat/recommended'],
  {
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
];
