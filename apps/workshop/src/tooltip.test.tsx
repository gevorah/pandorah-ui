/// <reference types="@vitest/browser-playwright" />
import {
  Button,
  Dialog,
  Popover,
  Tooltip,
  type TooltipOpenChangeDetails,
  type TooltipPopupProps,
  type TooltipRootProps,
} from '@pandorah-ui/react';
import { StrictMode, useState, type ReactElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
  type MockInstance,
} from 'vitest';
import { userEvent } from 'vitest/browser';

import { chromiumTap, isChromium, tab } from './test/browser';

let container: HTMLDivElement;
let root: Root;
let consoleError: MockInstance<typeof console.error>;

function render(element: ReactElement) {
  flushSync(() => root.render(element));
}

function errors() {
  return consoleError.mock.calls.map((call) => String(call[0]));
}

const styles = document.createElement('style');
styles.textContent = `
  .tooltip { box-sizing: border-box; width: 120px; padding: 4px; background: black; color: white; }
  .popover { box-sizing: border-box; width: 240px; padding: 8px; background: white; }
  .backdrop { position: fixed; inset: 0; display: grid; place-items: center; background: rgb(0 0 0 / 0.4); }
  .dialog { box-sizing: border-box; width: 320px; padding: 16px; background: white; }`;

beforeAll(() => {
  document.head.append(styles);
});

afterAll(() => {
  styles.remove();
});

beforeEach(() => {
  container = document.body.appendChild(document.createElement('div'));
  root = createRoot(container);
  consoleError = vi.spyOn(console, 'error');
});

afterEach(async () => {
  root.unmount();
  container.remove();
  consoleError.mockRestore();
  // Park the pointer so the next test starts without hovering anything.
  await rest();
});

const tooltips = () => [
  ...document.querySelectorAll<HTMLElement>('[role="tooltip"]'),
];
const tooltip = () => tooltips()[0] ?? null;
const button = (name: string) =>
  [...document.querySelectorAll('button')].find(
    (candidate) =>
      candidate.textContent === name ||
      candidate.getAttribute('aria-label') === name,
  )!;
const save = () => button('Save');
const settle = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

const opened = () =>
  vi.waitFor(() => expect(tooltip()?.getAttribute('data-state')).toBe('open'));
/** Waits for every tooltip to leave the document once it has closed. */
const closed = () => vi.waitFor(() => expect(tooltips()).toHaveLength(0));

const near = (actual: number, expected: number) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1);

const focused = (element: Element) =>
  vi.waitFor(() => expect(document.activeElement).toBe(element));

function rest() {
  return userEvent.hover(document.body, {
    position: { x: 1, y: 1 },
    force: true,
  });
}

/** Hovers a point outside an element, relative to its top-left corner. */
function hoverAt(element: Element, position: { x: number; y: number }) {
  return userEvent.hover(element, { position, force: true });
}

type OnOpenChange = Mock<
  (open: boolean, details: TooltipOpenChangeDetails) => void
>;

/** Each request with the type of the event that caused it. */
function requests(onOpenChange: OnOpenChange) {
  return onOpenChange.mock.calls.map(([open, { reason, event }]) => [
    open,
    reason,
    event.type,
  ]);
}

interface SaveProps extends TooltipRootProps {
  popup?: TooltipPopupProps;
}

function Save({ popup, ...props }: SaveProps) {
  return (
    <Tooltip.Root {...props}>
      <Tooltip.Trigger aria-label="Save">💾</Tooltip.Trigger>
      <Tooltip.Popup className="tooltip" sideOffset={8} {...popup}>
        Save changes
      </Tooltip.Popup>
    </Tooltip.Root>
  );
}

function Page(props: SaveProps) {
  return (
    <div style={{ padding: 80, display: 'flex', gap: 40 }}>
      <button>Before</button>
      <Save {...props} />
      <button>After</button>
    </div>
  );
}

describe('Tooltip', () => {
  it('opens on hover after a delay and describes its trigger', async () => {
    const onOpenChange: OnOpenChange = vi.fn();
    render(<Page onOpenChange={onOpenChange} />);
    expect(save().type).toBe('button');
    expect(save().hasAttribute('aria-describedby')).toBe(false);

    await userEvent.hover(save());
    await settle(300);
    expect(tooltip()).toBeNull();
    await opened();
    const element = tooltip()!;
    expect(element.getAttribute('data-side')).toBe('top');
    expect(element.getAttribute('data-align')).toBe('center');
    expect(element.hasAttribute('inert')).toBe(false);
    expect(element.hasAttribute('tabindex')).toBe(false);
    expect(element.parentElement!.hasAttribute('data-floating-ui-portal')).toBe(
      true,
    );
    expect(save().getAttribute('aria-describedby')).toBe(element.id);
    await expect.element(save()).toHaveAccessibleName('Save');
    await expect.element(save()).toHaveAccessibleDescription('Save changes');
    expect(document.activeElement).toBe(document.body);

    await userEvent.hover(button('Before'));
    await closed();
    expect(save().hasAttribute('aria-describedby')).toBe(false);
    expect(requests(onOpenChange)).toEqual([
      [true, 'trigger-hover', 'mouseenter'],
      [false, 'trigger-hover', 'mouseleave'],
    ]);

    // Leaving before the delay cancels it.
    onOpenChange.mockClear();
    await userEvent.hover(save());
    await settle(200);
    await userEvent.hover(button('After'));
    await settle(700);
    expect(tooltip()).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(errors()).toEqual([]);
  });

  it('stays open while the pointer crosses to it and rests on it', async () => {
    render(<Page />);
    await userEvent.hover(save());
    await opened();
    const { width } = save().getBoundingClientRect();
    // The gap between the trigger and the tooltip above it.
    await hoverAt(save(), { x: width / 2, y: -4 });
    await settle(100);
    await userEvent.hover(tooltip()!);
    await settle(300);
    expect(tooltip()!.getAttribute('data-state')).toBe('open');

    await userEvent.hover(button('After'));
    await closed();
  });

  it('opens at once on keyboard focus, and stays open while focused', async () => {
    const onOpenChange: OnOpenChange = vi.fn();
    render(<Page onOpenChange={onOpenChange} />);
    button('Before').focus();
    await tab();
    await focused(save());
    await settle(100);
    expect(tooltip()?.getAttribute('data-state')).toBe('open');
    expect(save().getAttribute('aria-describedby')).toBe(tooltip()!.id);

    // The pointer passing over and away does not hide it while focus stays.
    await userEvent.hover(save());
    await userEvent.hover(button('After'));
    await settle(100);
    expect(tooltip()?.getAttribute('data-state')).toBe('open');
    expect(document.activeElement).toBe(save());

    await tab();
    await focused(button('After'));
    await closed();
    expect(requests(onOpenChange)).toEqual([
      [true, 'trigger-focus', 'focusin'],
      [false, 'trigger-focus', 'focusout'],
    ]);
  });

  it('closes on Escape without moving focus or reopening', async () => {
    const onOpenChange: OnOpenChange = vi.fn();
    render(<Page onOpenChange={onOpenChange} />);
    button('Before').focus();
    await tab();
    await opened();
    await userEvent.keyboard('{Escape}');
    await closed();
    expect(document.activeElement).toBe(save());
    await settle(100);
    expect(tooltip()).toBeNull();

    await userEvent.hover(save());
    await opened();
    await userEvent.keyboard('{Escape}');
    await closed();
    // Moving within the trigger is the same hover: it stays closed.
    await hoverAt(save(), { x: 2, y: 2 });
    await settle(800);
    expect(tooltip()).toBeNull();
    expect(document.activeElement).toBe(save());

    // A new hover opens it again.
    await userEvent.hover(button('After'));
    await userEvent.hover(save());
    await opened();
    expect(requests(onOpenChange)).toEqual([
      [true, 'trigger-focus', 'focusin'],
      [false, 'escape-key', 'keydown'],
      [true, 'trigger-hover', 'mouseenter'],
      [false, 'escape-key', 'keydown'],
      [true, 'trigger-hover', 'mouseenter'],
    ]);
  });

  it('closes on a press of its trigger instead of toggling', async () => {
    const onOpenChange: OnOpenChange = vi.fn();
    render(<Page onOpenChange={onOpenChange} />);
    await userEvent.click(save());
    await settle(800);
    expect(tooltip()).toBeNull();

    await userEvent.hover(button('After'));
    await userEvent.hover(save());
    await opened();
    await userEvent.click(save());
    await closed();
    await settle(800);
    expect(tooltip()).toBeNull();
    expect(requests(onOpenChange)).toEqual([
      [true, 'trigger-hover', 'mouseenter'],
      [false, 'trigger-press', 'click'],
    ]);
  });

  it.runIf(isChromium)('does not open from a touch', async () => {
    const onOpenChange: OnOpenChange = vi.fn();
    render(<Page onOpenChange={onOpenChange} />);
    await chromiumTap(save());
    await settle(800);
    expect(tooltip()).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('leaves every change to a controlled consumer', async () => {
    const onOpenChange: OnOpenChange = vi.fn();
    render(<Page open={false} onOpenChange={onOpenChange} />);
    await userEvent.hover(save());
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalled());
    await settle(100);
    expect(tooltip()).toBeNull();
    expect(requests(onOpenChange)).toEqual([
      [true, 'trigger-hover', 'mouseenter'],
    ]);

    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <Page
            open={open}
            onOpenChange={(next, details) => {
              onOpenChange(next, details);
              setOpen(next);
            }}
          />
          <output>{String(open)}</output>
        </>
      );
    }
    onOpenChange.mockClear();
    await userEvent.hover(button('After'));
    render(<Controlled />);
    await opened();
    button('Before').focus();
    await tab();
    await focused(save());
    await userEvent.keyboard('{Escape}');
    await closed();
    expect(document.querySelector('output')!.textContent).toBe('false');
    expect(requests(onOpenChange)).toEqual([[false, 'escape-key', 'keydown']]);
  });

  it('composes its trigger and popup', async () => {
    render(
      <>
        <p id="hint">Saves to the cloud</p>
        <Tooltip.Root defaultOpen>
          <Tooltip.Trigger
            aria-describedby="hint"
            render={<Button aria-label="Save" />}
          >
            💾
          </Tooltip.Trigger>
          <Tooltip.Popup
            render={(props) => <span {...props} className="tooltip" />}
          >
            Save changes
          </Tooltip.Popup>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger render={<a href="#top" />}>Top</Tooltip.Trigger>
          <Tooltip.Popup className="tooltip">Back to top</Tooltip.Popup>
        </Tooltip.Root>
      </>,
    );
    await opened();
    expect(tooltip()!.localName).toBe('span');
    expect(save().getAttribute('aria-describedby')).toBe(
      `hint ${tooltip()!.id}`,
    );
    await expect
      .element(save())
      .toHaveAccessibleDescription('Saves to the cloud Save changes');

    const link = document.querySelector('a')!;
    expect(link.hasAttribute('type')).toBe(false);
    save().focus();
    await tab();
    await focused(link);
    await vi.waitFor(() =>
      expect(link.getAttribute('aria-describedby')).toBe(
        tooltips().find((element) => element.textContent === 'Back to top')?.id,
      ),
    );
    expect(errors()).toEqual([]);
  });

  describe('hover and focus together', () => {
    it('stays open while hovered after focus leaves, and closes once hover ends', async () => {
      const onOpenChange: OnOpenChange = vi.fn();
      render(<Page onOpenChange={onOpenChange} />);
      button('Before').focus();
      await tab();
      await opened();
      await userEvent.hover(save());
      await settle(700);
      await tab();
      await focused(button('After'));
      await settle(100);
      expect(tooltip()?.getAttribute('data-state')).toBe('open');

      await userEvent.hover(button('After'));
      await closed();
      expect(requests(onOpenChange)).toEqual([
        [true, 'trigger-focus', 'focusin'],
        [false, 'trigger-hover', 'mouseleave'],
      ]);
    });

    it('stays open while its popup is hovered after focus leaves', async () => {
      const onOpenChange: OnOpenChange = vi.fn();
      render(<Page onOpenChange={onOpenChange} />);
      button('Before').focus();
      await tab();
      await opened();
      await userEvent.hover(tooltip()!);
      await tab();
      await focused(button('After'));
      await settle(100);
      expect(tooltip()?.getAttribute('data-state')).toBe('open');

      await userEvent.hover(button('After'));
      await closed();
      expect(requests(onOpenChange)).toEqual([
        [true, 'trigger-focus', 'focusin'],
        [false, 'trigger-hover', 'mouseleave'],
      ]);
    });

    it('closes on the later of hover and focus ending when a controlled consumer refuses one', async () => {
      const onOpenChange: OnOpenChange = vi.fn();
      function Controlled() {
        const [open, setOpen] = useState(false);
        return (
          <Page
            open={open}
            onOpenChange={(next, details) => {
              onOpenChange(next, details);
              if (next || details.reason !== 'trigger-hover') setOpen(next);
            }}
          />
        );
      }
      render(<Controlled />);
      button('Before').focus();
      await tab();
      await opened();
      await userEvent.hover(save());
      await tab();
      await focused(button('After'));
      await userEvent.hover(button('After'));
      await settle(100);
      expect(tooltip()?.getAttribute('data-state')).toBe('open');

      await tab({ shift: true });
      await focused(save());
      await tab();
      await focused(button('After'));
      await closed();
      expect(requests(onOpenChange)).toEqual([
        [true, 'trigger-focus', 'focusin'],
        [false, 'trigger-hover', 'mouseleave'],
        [false, 'trigger-focus', 'focusout'],
      ]);
    });

    it('opens on new keyboard focus after Escape closed it on hover', async () => {
      const onOpenChange: OnOpenChange = vi.fn();
      render(<Page onOpenChange={onOpenChange} />);
      await userEvent.hover(save());
      await opened();
      await userEvent.keyboard('{Escape}');
      await closed();
      await settle(800);
      expect(tooltip()).toBeNull();

      button('Before').focus();
      await tab();
      await focused(save());
      await settle(100);
      expect(tooltip()?.getAttribute('data-state')).toBe('open');

      await userEvent.keyboard('{Enter}');
      await closed();
      await settle(100);
      expect(tooltip()).toBeNull();

      await tab();
      await userEvent.hover(button('After'));
      await userEvent.hover(save());
      await settle(300);
      expect(tooltip()).toBeNull();
      await opened();
      expect(requests(onOpenChange)).toEqual([
        [true, 'trigger-hover', 'mouseenter'],
        [false, 'escape-key', 'keydown'],
        [true, 'trigger-focus', 'focusin'],
        [false, 'trigger-press', 'click'],
        [true, 'trigger-hover', 'mouseenter'],
      ]);
    });
  });

  describe('positioning', () => {
    function At({
      left,
      top,
      ...props
    }: SaveProps & { left: number | string; top: number | string }) {
      return (
        <div style={{ position: 'fixed', left, top, display: 'flex' }}>
          <Save {...props} />
          <button>After</button>
        </div>
      );
    }

    const rects = () => ({
      trigger: save().getBoundingClientRect(),
      popup: tooltip()!.getBoundingClientRect(),
    });

    it('places itself by the trigger, flipping and shifting to stay in view', async () => {
      render(<At left={200} top={200} defaultOpen />);
      await vi.waitFor(() => {
        const { trigger, popup } = rects();
        near(popup.bottom, trigger.top - 8);
        near(popup.left + popup.width / 2, trigger.left + trigger.width / 2);
      });

      render(
        <At
          left={200}
          top={200}
          defaultOpen
          popup={{ side: 'bottom', align: 'start', sideOffset: 4 }}
        />,
      );
      await vi.waitFor(() => {
        const { trigger, popup } = rects();
        near(popup.top, trigger.bottom + 4);
        near(popup.left, trigger.left);
      });
      expect(tooltip()!.getAttribute('data-side')).toBe('bottom');
      expect(tooltip()!.getAttribute('data-align')).toBe('start');

      // No room above: it flips below.
      render(<At left={200} top={0} defaultOpen />);
      await vi.waitFor(() =>
        expect(tooltip()!.getAttribute('data-side')).toBe('bottom'),
      );
      expect(rects().popup.top).toBeGreaterThanOrEqual(rects().trigger.bottom);

      // No room to the right: it shifts into view.
      render(<At left="calc(100vw - 30px)" top={200} defaultOpen />);
      await vi.waitFor(() =>
        expect(rects().popup.right).toBeLessThanOrEqual(
          document.documentElement.clientWidth + 1,
        ),
      );
    });

    it('is placed before its first frame', async () => {
      render(<At left={200} top={200} />);
      const firstFrame = new Promise<{ trigger: DOMRect; popup: DOMRect }>(
        (resolve) => {
          save().addEventListener(
            'focus',
            () => requestAnimationFrame(() => resolve(rects())),
            { once: true },
          );
        },
      );
      button('After').focus();
      await tab({ shift: true });
      const { trigger, popup } = await firstFrame;
      near(popup.bottom, trigger.top - 8);
    });
  });

  describe('animation', () => {
    const transitions = (element: Element) =>
      element
        .getAnimations()
        .filter((animation) => animation instanceof CSSTransition);

    it('stays mounted and inert, without describing its trigger, until its exit transition ends', async () => {
      const style = document.head.appendChild(document.createElement('style'));
      style.textContent = `
        .tooltip { transition: opacity 400ms; }
        @starting-style { .tooltip[data-state="open"] { opacity: 0; } }
        .tooltip[data-state="closed"] { opacity: 0; }`;
      try {
        render(<Page />);
        button('Before').focus();
        await tab();
        await opened();
        const element = tooltip()!;
        expect(transitions(element)).toHaveLength(1);
        await vi.waitFor(() => expect(transitions(element)).toHaveLength(0));

        await userEvent.keyboard('{Escape}');
        expect(transitions(element)).toHaveLength(1);
        expect(element.getAttribute('data-state')).toBe('closed');
        expect(element.hasAttribute('inert')).toBe(true);
        expect(save().hasAttribute('aria-describedby')).toBe(false);
        expect(element.isConnected).toBe(true);
        await closed();
        expect(
          document.querySelectorAll('[data-floating-ui-portal]'),
        ).toHaveLength(0);
      } finally {
        style.remove();
      }
    });

    it('reopens during its exit animation', async () => {
      const style = document.head.appendChild(document.createElement('style'));
      style.textContent = `
        @keyframes fade-out { to { opacity: 0; } }
        .tooltip[data-state="closed"] { animation: fade-out 800ms; }`;
      try {
        render(<Page />);
        await userEvent.hover(save());
        await opened();
        const element = tooltip()!;
        await userEvent.hover(button('After'));
        await vi.waitFor(() =>
          expect(element.getAttribute('data-state')).toBe('closed'),
        );
        button('Before').focus();
        await tab();
        await opened();
        expect(tooltip()).toBe(element);
        expect(element.hasAttribute('inert')).toBe(false);
        await settle(900);
        expect(tooltip()).toBe(element);
        expect(save().getAttribute('aria-describedby')).toBe(element.id);
      } finally {
        style.remove();
      }
    });
  });

  it('works in Strict Mode and cleans up when unmounted', async () => {
    render(
      <StrictMode>
        <Page />
      </StrictMode>,
    );
    button('Before').focus();
    await tab();
    await opened();
    await userEvent.keyboard('{Escape}');
    await closed();
    await userEvent.hover(save());
    await opened();
    root.unmount();
    expect(document.querySelectorAll('[data-floating-ui-portal]')).toHaveLength(
      0,
    );

    // A pending hover delay ends with the tooltip.
    root = createRoot(container);
    render(<Page />);
    await userEvent.hover(button('After'));
    await userEvent.hover(save());
    root.unmount();
    await settle(800);
    root = createRoot(container);
    expect(errors()).toEqual([]);
  });

  describe('with Dialog', () => {
    function Profile(props: { open?: boolean }) {
      return (
        <Dialog.Root defaultOpen open={props.open}>
          <Dialog.Backdrop className="backdrop">
            <Dialog.Popup className="dialog" aria-label="Profile">
              <input aria-label="Name" />
              <Save />
              <Dialog.Close>Cancel</Dialog.Close>
            </Dialog.Popup>
          </Dialog.Backdrop>
        </Dialog.Root>
      );
    }

    it('works inside a dialog, closing before it on Escape', async () => {
      render(<Profile />);
      await focused(document.querySelector('[aria-label="Name"]')!);
      await tab();
      await focused(save());
      await opened();
      expect(tooltip()!.closest('[inert]')).toBeNull();
      expect(
        tooltip()!
          .closest('[data-floating-ui-portal]')!
          .parentElement!.closest('[data-floating-ui-portal]'),
      ).not.toBeNull();

      await userEvent.keyboard('{Escape}');
      await closed();
      expect(document.querySelector('[aria-modal="true"]')).not.toBeNull();
      expect(document.activeElement).toBe(save());
      await userEvent.keyboard('{Escape}');
      await vi.waitFor(() =>
        expect(document.querySelector('[aria-modal="true"]')).toBeNull(),
      );
    });

    it('closes with its dialog', async () => {
      render(<Profile open />);
      await focused(document.querySelector('[aria-label="Name"]')!);
      await tab();
      await opened();
      render(<Profile open={false} />);
      await closed();
      expect(
        document.querySelectorAll('[data-floating-ui-portal]'),
      ).toHaveLength(0);
      expect(errors()).toEqual([]);
    });

    it('does not open on content a dialog makes inert', async () => {
      const other = document.body.appendChild(document.createElement('div'));
      const otherRoot = createRoot(other);
      try {
        render(<Page />);
        flushSync(() =>
          otherRoot.render(
            <Dialog.Root defaultOpen>
              <Dialog.Popup className="dialog" aria-label="Profile">
                <input aria-label="Name" />
              </Dialog.Popup>
            </Dialog.Root>,
          ),
        );
        await focused(document.querySelector('[aria-label="Name"]')!);
        expect(save().closest('[inert]')).not.toBeNull();
        await hoverAt(save(), { x: 4, y: 4 });
        await settle(800);
        expect(tooltip()).toBeNull();
      } finally {
        otherRoot.unmount();
        other.remove();
      }
    });

    it('leaves Escape to a dialog in another React root above it', async () => {
      const other = document.body.appendChild(document.createElement('div'));
      const otherRoot = createRoot(other);
      try {
        render(<Page defaultOpen />);
        await opened();
        flushSync(() =>
          otherRoot.render(
            <Dialog.Root defaultOpen>
              <Dialog.Popup className="dialog" aria-label="Profile">
                <input aria-label="Name" />
              </Dialog.Popup>
            </Dialog.Root>,
          ),
        );
        await focused(document.querySelector('[aria-label="Name"]')!);
        expect(tooltip()!.closest('[inert]')).not.toBeNull();
        await userEvent.keyboard('{Escape}');
        await vi.waitFor(() =>
          expect(document.querySelector('[aria-modal="true"]')).toBeNull(),
        );
        expect(tooltip()!.getAttribute('data-state')).toBe('open');
        await userEvent.keyboard('{Escape}');
        await closed();
        expect(errors()).toEqual([]);
      } finally {
        otherRoot.unmount();
        other.remove();
      }
    });
  });

  describe('with Popover', () => {
    function Share() {
      return (
        <div style={{ padding: 80 }}>
          <Popover.Root>
            <Tooltip.Root>
              <Tooltip.Trigger render={<Popover.Trigger />}>
                Share
              </Tooltip.Trigger>
              <Tooltip.Popup className="tooltip">
                Share this draft
              </Tooltip.Popup>
            </Tooltip.Root>
            <Popover.Popup className="popover" aria-label="Share">
              <input aria-label="Link" />
              <Save />
            </Popover.Popup>
          </Popover.Root>
        </div>
      );
    }
    const share = () => button('Share');
    const popover = () =>
      document.querySelector<HTMLElement>('[role="dialog"]');

    it('describes a popover trigger and closes when it opens the popover', async () => {
      render(<Share />);
      await userEvent.hover(share());
      await opened();
      expect(share().getAttribute('aria-haspopup')).toBe('dialog');
      await expect
        .element(share())
        .toHaveAccessibleDescription('Share this draft');

      await userEvent.click(share());
      await vi.waitFor(() => expect(popover()).not.toBeNull());
      await closed();
      expect(share().getAttribute('aria-expanded')).toBe('true');
      expect(errors()).toEqual([]);
    });

    it('closes before its popover on Escape', async () => {
      render(<Share />);
      share().focus();
      await userEvent.keyboard('{Enter}');
      await focused(document.querySelector('[aria-label="Link"]')!);
      await tab();
      await focused(save());
      await opened();
      expect(tooltip()!.textContent).toBe('Save changes');

      await userEvent.keyboard('{Escape}');
      await vi.waitFor(() =>
        expect(
          tooltips().filter(
            (element) => element.getAttribute('data-state') === 'open',
          ),
        ).toHaveLength(0),
      );
      expect(popover()!.getAttribute('data-state')).toBe('open');
      expect(document.activeElement).toBe(save());

      await userEvent.keyboard('{Escape}');
      await vi.waitFor(() => expect(popover()).toBeNull());
      await focused(share());
    });
  });
});
