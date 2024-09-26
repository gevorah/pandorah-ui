import sharedConfig from '@pandorah-ui/tailwind-config';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  presets: [sharedConfig]
};

