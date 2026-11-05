/// <reference types="@vitest/browser-playwright" />
import { cdp, commands, page, server, userEvent } from 'vitest/browser';

declare module 'vitest/browser' {
  interface BrowserCommands {
    mouse: (
      action: 'down' | 'up',
      selector: string,
      offset?: { x: number; y: number },
    ) => Promise<void>;
    wheel: (
      selector: string,
      offset: { x: number; y: number },
      deltaY: number,
    ) => Promise<void>;
  }
}

export const isChromium = server.browser === 'chromium';

// WebKit on macOS behaves like Safari: clicking a button does not focus it,
// and Tab reaches buttons only with Option held.
export const clickFocusesButtons = server.browser !== 'webkit';
const tabKey = server.browser === 'webkit' ? '{Alt>}{Tab}{/Alt}' : '{Tab}';
const shiftTabKey =
  server.browser === 'webkit'
    ? '{Alt>}{Shift>}{Tab}{/Shift}{/Alt}'
    : '{Shift>}{Tab}{/Shift}';

export function tab({ shift = false } = {}) {
  return userEvent.keyboard(shift ? shiftTabKey : tabKey);
}

/**
 * Presses or releases the primary mouse button over an element, at an offset
 * from its top-left corner. A negative offset reaches just outside it.
 */
export function mouse(
  action: 'down' | 'up',
  element: Element,
  offset?: { x: number; y: number },
) {
  return commands.mouse(action, page.elementLocator(element).selector, offset);
}

/** Scrolls with the mouse wheel over a point relative to an element. */
export function wheel(
  element: Element,
  offset: { x: number; y: number },
  deltaY: number,
) {
  return commands.wheel(page.elementLocator(element).selector, offset, deltaY);
}

/** Presses or releases Space on the focused element. */
export function space(action: 'down' | 'up') {
  return userEvent.keyboard(action === 'down' ? '[Space>]' : '[/Space]');
}

type AXNode = {
  ignored: boolean;
  role?: { value: string };
  name?: { value: string };
  description?: { value: string };
  properties?: { name: string; value: { value: unknown } }[];
};
type FrameTree = { frame: { id: string }; childFrames?: FrameTree[] };

/**
 * Finds a node in Chromium's accessibility tree, across frames. Other engines
 * expose no accessibility tree to Playwright, so callers check them through
 * the DOM contract instead.
 */
export async function chromiumAXNode(role: string, name: string) {
  const session = cdp();
  await session.send('Accessibility.enable');
  const { frameTree } = (await session.send('Page.getFrameTree')) as {
    frameTree: FrameTree;
  };
  const frames: string[] = [];
  const walk = (tree: FrameTree) => {
    frames.push(tree.frame.id);
    tree.childFrames?.forEach(walk);
  };
  walk(frameTree);
  for (const frameId of frames) {
    const { nodes } = (await session.send('Accessibility.getFullAXTree', {
      frameId,
    })) as { nodes: AXNode[] };
    const node = nodes.find(
      (candidate) =>
        !candidate.ignored &&
        candidate.role?.value === role &&
        candidate.name?.value === name,
    );
    if (node) return node;
  }
  return undefined;
}

export function axProperties(node: AXNode | undefined, names: string[]) {
  return Object.fromEntries(
    (node?.properties ?? [])
      .filter(({ name }) => names.includes(name))
      .map(({ name, value }) => [name, value.value]),
  );
}

/** Taps an element with Chromium's touch emulation. */
export async function chromiumTap(element: Element) {
  const { x, y, width, height } = element.getBoundingClientRect();
  const point = { x: x + width / 2, y: y + height / 2 };
  const session = cdp();
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [point],
  });
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: false });
}
