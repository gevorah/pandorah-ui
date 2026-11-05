import { mkdirSync } from 'node:fs';
import { release } from 'node:os';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import type { BrowserCommand } from 'vitest/node';

type Point = { x: number; y: number };

// Moves the mouse to a point relative to an element's top-left corner, then
// presses or releases the primary button there.
const mouse: BrowserCommand<
  [action: 'down' | 'up', selector: string, offset?: Point]
> = async ({ iframe, page }, action, selector, offset = { x: 5, y: 5 }) => {
  const box = await iframe.locator(selector).boundingBox();
  if (!box) throw new Error(`mouse: ${selector} is not visible.`);
  await page.mouse.move(box.x + offset.x, box.y + offset.y);
  await (action === 'down' ? page.mouse.down() : page.mouse.up());
};

// Scrolls with the mouse wheel over a point relative to an element, as a
// user would. Programmatic scrolling ignores `overflow: hidden`.
const wheel: BrowserCommand<
  [selector: string, offset: Point, deltaY: number]
> = async ({ iframe, page }, selector, offset, deltaY) => {
  const box = await iframe.locator(selector).boundingBox();
  if (!box) throw new Error(`wheel: ${selector} is not visible.`);
  await page.mouse.move(box.x + offset.x, box.y + offset.y);
  await page.mouse.wheel(0, deltaY);
};

// Playwright's Firefox does not start on macOS 27: it reads its profile list
// from ~/Library/Application Support/Firefox, which macOS 27 protects
// (microsoft/playwright#42768). A home of its own inside node_modules lets it
// start; macOS puts folders there that resist deletion, so the home is reused
// rather than created per run. An explicit CFFIXED_USER_HOME wins. Still
// needed with Playwright 1.64.1 (Firefox 157); remove once a Playwright
// release starts Firefox on macOS 27 without it.
function firefox() {
  const affected =
    process.platform === 'darwin' && Number(release().split('.')[0]) >= 27;
  if (!affected || process.env.CFFIXED_USER_HOME !== undefined) {
    return { browser: 'firefox' as const };
  }
  const home = fileURLToPath(
    new URL('node_modules/.cache/firefox-home', import.meta.url),
  );
  mkdirSync(home, { recursive: true });
  return {
    browser: 'firefox' as const,
    provider: playwright({
      launchOptions: { env: { ...process.env, CFFIXED_USER_HOME: home } },
    }),
  };
}

const browser = (
  instances: {
    browser: 'chromium' | 'firefox' | 'webkit';
    provider?: ReturnType<typeof playwright>;
  }[],
) => ({
  enabled: true,
  headless: true,
  provider: playwright(),
  instances,
  commands: { mouse, wheel },
});

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [storybookTest({ configDir: '.storybook' })],
        test: {
          name: 'storybook',
          browser: browser([{ browser: 'chromium' }]),
        },
      },
      {
        test: {
          name: 'unit',
          include: ['src/**/*.test.tsx'],
          // Tests use real keyboard focus, which files running at once would share.
          fileParallelism: false,
          browser: browser([
            { browser: 'chromium' },
            firefox(),
            { browser: 'webkit' },
          ]),
        },
      },
    ],
  },
});
