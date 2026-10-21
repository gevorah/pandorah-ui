import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const chromium = () => ({
  enabled: true,
  headless: true,
  provider: playwright(),
  instances: [{ browser: 'chromium' as const }],
});

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [storybookTest({ configDir: '.storybook' })],
        test: { name: 'storybook', browser: chromium() },
      },
      {
        test: {
          name: 'unit',
          include: ['src/**/*.test.tsx'],
          browser: chromium(),
        },
      },
    ],
  },
});
