/// <reference types="@vitest/browser-playwright" />
import {
  Button,
  Dialog,
  Popover,
  type DialogRootProps,
  type PopoverOpenChangeDetails,
  type PopoverPopupProps,
  type PopoverRootProps,
} from '@pandorah-ui/react';
import {
  StrictMode,
  useState,
  type ComponentPropsWithRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
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

// Diagnostics are development-only; behavior is checked in both modes.
import { isDevelopment } from '../../../packages/react/src/internal/composition/diagnostics';
import {
  chromiumAXNode,
  chromiumTap,
  isChromium,
  mouse,
  tab,
} from './test/browser';

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

afterEach(() => {
  root.unmount();
  container.remove();
  document.documentElement.removeAttribute('style');
  window.scrollTo(0, 0);
  consoleError.mockRestore();
});

const popovers = () => [
  ...document.querySelectorAll<HTMLElement>(
    '[role="dialog"]:not([aria-modal])',
  ),
];
const popover = (label?: string) =>
  popovers().find(
    (element) =>
      label === undefined || element.getAttribute('aria-label') === label,
  ) ?? null;
const dialog = () => document.querySelector<HTMLElement>('[aria-modal="true"]');
const button = (name: string) =>
  [...document.querySelectorAll('button')].find(
    (candidate) => candidate.textContent === name,
  )!;
const field = (label: string) =>
  document.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;
const share = () => button('Share');
const settle = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

/** Waits for every popover to leave the document once it has closed. */
const closed = () => vi.waitFor(() => expect(popovers()).toHaveLength(0));

const focused = (element: Element) =>
  vi.waitFor(() => expect(document.activeElement).toBe(element));

async function openByKeyboard(trigger = share()) {
  trigger.focus();
  await userEvent.keyboard('{Enter}');
  await vi.waitFor(() => expect(popover()).not.toBeNull());
}

/** Presses the primary button just outside the dialog popup, on its backdrop. */
async function pressBackdrop() {
  await mouse('down', dialog()!, { x: -10, y: -10 });
  await mouse('up', document.body, { x: 1, y: 1 });
}

type OnOpenChange = Mock<
  (open: boolean, details: PopoverOpenChangeDetails) => void
>;

/** Each request with the type of the event that caused it. */
function requests(onOpenChange: OnOpenChange) {
  return onOpenChange.mock.calls.map(([open, { reason, event }]) => [
    open,
    reason,
    event.type,
  ]);
}

function changes(onOpenChange: OnOpenChange) {
  return onOpenChange.mock.calls.map(([open, { reason }]) => ({
    open,
    reason,
  }));
}

const request = (open: boolean, reason: string) => ({ open, reason });

interface ShareProps extends PopoverRootProps {
  popup?: PopoverPopupProps;
  content?: ReactNode;
}

function Share({ popup, content, ...props }: ShareProps) {
  return (
    <Popover.Root {...props}>
      <Popover.Trigger>Share</Popover.Trigger>
      <Popover.Popup className="popover" {...popup}>
        <Popover.Title>Share link</Popover.Title>
        <Popover.Description>
          Anyone with the link can view.
        </Popover.Description>
        <input aria-label="Link" />
        {content}
        <Popover.Close>Done</Popover.Close>
      </Popover.Popup>
    </Popover.Root>
  );
}

function Page(props: ShareProps) {
  return (
    <>
      <p>Plain text</p>
      <button>Before</button>
      <Share {...props} />
      <button>After</button>
      <input aria-label="Search" />
    </>
  );
}

function Profile({
  content,
  ...props
}: DialogRootProps & { content?: ReactNode }) {
  return (
    <Dialog.Root {...props}>
      <Dialog.Trigger>Edit profile</Dialog.Trigger>
      <Dialog.Backdrop className="backdrop">
        <Dialog.Popup className="dialog" aria-label="Profile">
          <input aria-label="Name" />
          {content}
          <Dialog.Close>Cancel</Dialog.Close>
        </Dialog.Popup>
      </Dialog.Backdrop>
    </Dialog.Root>
  );
}

describe('Popover', () => {
  it('opens a non-modal dialog named and described by its parts', async () => {
    const onOpenChange: OnOpenChange = vi.fn();
    render(<Page onOpenChange={onOpenChange} />);
    expect(popover()).toBeNull();
    expect(share().type).toBe('button');
    expect(share().getAttribute('aria-expanded')).toBe('false');
    expect(share().hasAttribute('aria-controls')).toBe(false);

    await userEvent.click(share());
    const element = popover()!;
    expect(element.getAttribute('role')).toBe('dialog');
    expect(element.hasAttribute('aria-modal')).toBe(false);
    expect(element.getAttribute('data-state')).toBe('open');
    expect(element.getAttribute('data-side')).toBe('bottom');
    expect(element.getAttribute('data-align')).toBe('center');
    expect(element.hasAttribute('inert')).toBe(false);
    expect(share().getAttribute('aria-expanded')).toBe('true');
    expect(share().getAttribute('aria-controls')).toBe(element.id);
    expect(share().hasAttribute('data-popup-open')).toBe(true);
    expect(element.parentElement!.hasAttribute('data-floating-ui-portal')).toBe(
      true,
    );
    await expect.element(element).toHaveAccessibleName('Share link');
    await expect
      .element(element)
      .toHaveAccessibleDescription('Anyone with the link can view.');
    await focused(field('Link'));
    // Non-modal: nothing behind it is inert or hidden.
    for (const element of [button('Before'), field('Search')]) {
      expect(element.closest('[inert], [aria-hidden]')).toBeNull();
    }

    await userEvent.click(share());
    await closed();
    await focused(share());
    expect(share().getAttribute('aria-expanded')).toBe('false');
    expect(share().hasAttribute('data-popup-open')).toBe(false);
    expect(changes(onOpenChange)).toEqual([
      request(true, 'trigger-press'),
      request(false, 'trigger-press'),
    ]);
    expect(errors()).toEqual([]);
  });

  it('returns focus to the trigger after Escape and Close', async () => {
    const onOpenChange: OnOpenChange = vi.fn();
    render(<Page onOpenChange={onOpenChange} />);
    await openByKeyboard();
    await focused(field('Link'));
    await userEvent.keyboard('{Escape}');
    await closed();
    await focused(share());

    await userEvent.click(share());
    await focused(field('Link'));
    await userEvent.click(button('Done'));
    await closed();
    await focused(share());
    expect(changes(onOpenChange)).toEqual([
      request(true, 'trigger-press'),
      request(false, 'escape-key'),
      request(true, 'trigger-press'),
      request(false, 'close-press'),
    ]);
  });

  it('leaves focus where an outside press moves it', async () => {
    const onOpenChange: OnOpenChange = vi.fn();
    render(<Page onOpenChange={onOpenChange} />);
    await userEvent.click(share());
    await focused(field('Link'));
    await userEvent.click(field('Search'));
    await closed();
    expect(document.activeElement).toBe(field('Search'));

    await userEvent.click(share());
    await focused(field('Link'));
    const text = document.querySelector('p')!;
    await mouse('down', text);
    await mouse('up', text);
    await closed();
    await settle();
    expect(document.activeElement).toBe(document.body);
    expect(changes(onOpenChange)).toEqual([
      request(true, 'trigger-press'),
      request(false, 'outside-press'),
      request(true, 'trigger-press'),
      request(false, 'outside-press'),
    ]);
  });

  it('keeps the tab order of the page and closes when focus leaves it', async () => {
    const onOpenChange: OnOpenChange = vi.fn();
    render(<Page onOpenChange={onOpenChange} />);
    await openByKeyboard();
    await focused(field('Link'));

    // Back to the trigger, which keeps it open, and in again.
    await tab({ shift: true });
    await focused(share());
    expect(popover()!.getAttribute('data-state')).toBe('open');
    await tab();
    await focused(field('Link'));

    await tab();
    await focused(button('Done'));
    await tab();
    await focused(button('After'));
    await closed();
    // Focus moved on, so it stays.
    await settle();
    expect(document.activeElement).toBe(button('After'));
    expect(changes(onOpenChange)).toEqual([
      request(true, 'trigger-press'),
      request(false, 'focus-out'),
    ]);
  });

  it('leaves every change to a controlled consumer', async () => {
    const onOpenChange: OnOpenChange = vi.fn();
    const app = (open: boolean) => (
      <Page open={open} onOpenChange={onOpenChange} />
    );
    render(app(true));
    await focused(field('Link'));

    await userEvent.keyboard('{Escape}');
    await userEvent.click(button('Done'));
    await userEvent.click(share());
    // A press on a field presses outside, then moves focus out: two requests.
    field('Link').focus();
    await userEvent.click(field('Search'));
    await settle();
    expect(popover()!.getAttribute('data-state')).toBe('open');

    field('Link').focus();
    await tab();
    await tab();
    await focused(button('After'));
    await settle();
    expect(popover()!.getAttribute('data-state')).toBe('open');
    // Tabbing out reports once, from the focus guard after the popup.
    expect(requests(onOpenChange)).toEqual([
      [false, 'escape-key', 'keydown'],
      [false, 'close-press', 'click'],
      [false, 'trigger-press', 'click'],
      [false, 'outside-press', 'mousedown'],
      [false, 'focus-out', 'focusout'],
      [false, 'focus-out', 'focusin'],
    ]);

    // Closed by the consumer while focus is inside: focus goes to the trigger.
    render(<></>);
    render(app(true));
    await focused(field('Link'));
    render(app(false));
    await closed();
    await focused(share());
  });

  describe('focus return', () => {
    it('lets Shift+Tab past the trigger reach the element before it', async () => {
      const onOpenChange: OnOpenChange = vi.fn();
      render(<Page onOpenChange={onOpenChange} />);
      await openByKeyboard();
      await focused(field('Link'));
      await tab({ shift: true });
      await focused(share());
      await tab({ shift: true });
      await closed();
      await focused(button('Before'));
      await settle();
      expect(document.activeElement).toBe(button('Before'));
      expect(requests(onOpenChange)).toEqual([
        [true, 'trigger-press', 'click'],
        [false, 'focus-out', 'focusout'],
      ]);
    });

    it('returns focus on a later close after a refused outside press', async () => {
      const onOpenChange: OnOpenChange = vi.fn();
      const app = (open: boolean) => (
        <Page open={open} onOpenChange={onOpenChange} />
      );
      render(app(true));
      await focused(field('Link'));
      const text = document.querySelector('p')!;
      await mouse('down', text);
      await mouse('up', text);
      await settle();
      expect(popover()!.getAttribute('data-state')).toBe('open');
      field('Link').focus();
      render(app(false));
      await closed();
      await focused(share());
      expect(requests(onOpenChange)).toEqual([
        [false, 'outside-press', 'mousedown'],
      ]);
    });

    it('returns focus when a dismissal is accepted after refused ones', async () => {
      const onOpenChange: OnOpenChange = vi.fn();
      let accept = false;
      function Gatekeeper() {
        const [open, setOpen] = useState(true);
        return (
          <Page
            open={open}
            onOpenChange={(next, details) => {
              onOpenChange(next, details);
              if (accept) setOpen(next);
            }}
          />
        );
      }
      for (const dismiss of [
        () => userEvent.keyboard('{Escape}'),
        () => userEvent.click(button('Done')),
      ]) {
        accept = false;
        render(<Gatekeeper key={String(dismiss)} />);
        await focused(field('Link'));
        await userEvent.keyboard('{Escape}');
        const text = document.querySelector('p')!;
        await mouse('down', text);
        await mouse('up', text);
        field('Link').focus();
        await tab();
        await tab();
        await focused(button('After'));
        field('Link').focus();
        await settle();
        expect(popover()!.getAttribute('data-state')).toBe('open');

        accept = true;
        await dismiss();
        await closed();
        await focused(share());
        render(<></>);
      }
      const refused = [
        [false, 'escape-key', 'keydown'],
        [false, 'outside-press', 'mousedown'],
        [false, 'focus-out', 'focusin'],
      ];
      expect(requests(onOpenChange)).toEqual([
        ...refused,
        [false, 'escape-key', 'keydown'],
        ...refused,
        [false, 'close-press', 'click'],
      ]);
    });

    it('returns focus after a cancelled Escape and an accepted one', async () => {
      let cancel = true;
      render(
        <Share
          popup={{
            onKeyDown: (event) => {
              if (cancel && event.key === 'Escape') event.preventDefault();
            },
          }}
        />,
      );
      await userEvent.click(share());
      await focused(field('Link'));
      await userEvent.keyboard('{Escape}');
      await settle();
      expect(popover()!.getAttribute('data-state')).toBe('open');
      cancel = false;
      await userEvent.keyboard('{Escape}');
      await closed();
      await focused(share());
    });

    it('returns focus a removed popup took, unless focus had moved on', async () => {
      const app = (popup: boolean) => (
        <>
          <Popover.Root open>
            <Popover.Trigger>Share</Popover.Trigger>
            {popup && (
              <Popover.Popup aria-label="Share">
                <input aria-label="Link" />
              </Popover.Popup>
            )}
          </Popover.Root>
          <input aria-label="Search" />
        </>
      );
      render(app(true));
      await focused(field('Link'));
      render(app(false));
      await focused(share());

      render(app(true));
      await focused(field('Link'));
      field('Search').focus();
      render(app(false));
      await settle();
      expect(document.activeElement).toBe(field('Search'));
    });
  });

  it('lets consumers cancel Escape, outside presses and trigger presses', async () => {
    const onOpenChange: OnOpenChange = vi.fn();
    let cancelTrigger = false;
    render(
      <>
        <Popover.Root onOpenChange={onOpenChange}>
          <Popover.Trigger
            onClick={(event) => cancelTrigger && event.preventDefault()}
          >
            Share
          </Popover.Trigger>
          <Popover.Popup
            aria-label="Share"
            onKeyDown={(event) => {
              if (event.key === 'Escape') event.preventDefault();
            }}
          >
            <input aria-label="Link" />
          </Popover.Popup>
        </Popover.Root>
        <div onMouseDown={(event) => event.preventDefault()}>Keep open</div>
      </>,
    );
    await userEvent.click(share());
    await focused(field('Link'));
    await userEvent.keyboard('{Escape}');
    const keep = document.querySelector('div > div')!;
    await mouse('down', keep);
    await mouse('up', keep);
    cancelTrigger = true;
    await userEvent.click(share());
    await settle();
    expect(popover()!.getAttribute('data-state')).toBe('open');
    expect(changes(onOpenChange)).toEqual([request(true, 'trigger-press')]);
  });

  it('does not open from a disabled or pending trigger', async () => {
    const onOpenChange: OnOpenChange = vi.fn();
    for (const trigger of [
      <Popover.Trigger key="disabled" disabled>
        Share
      </Popover.Trigger>,
      <Popover.Trigger key="pending" render={<Button pending />}>
        Share
      </Popover.Trigger>,
      <Popover.Trigger key="aria" aria-disabled="true">
        Share
      </Popover.Trigger>,
    ]) {
      render(
        <Popover.Root onOpenChange={onOpenChange}>
          {trigger}
          <Popover.Popup aria-label="Share" />
        </Popover.Root>,
      );
      await userEvent.click(share(), { force: true });
      share().focus();
      await userEvent.keyboard('{Enter}');
      await settle();
      expect(popover()).toBeNull();
    }
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('composes its parts through elements, components and render functions', async () => {
    function Card(props: ComponentPropsWithRef<'section'>) {
      return <section data-card {...props} />;
    }
    for (const popup of [
      <section key="element" />,
      <Card key="component" />,
      (props: ComponentPropsWithRef<'div'>) => <article {...props} />,
    ]) {
      render(
        <Popover.Root defaultOpen>
          <Popover.Trigger render={<Button />}>Share</Popover.Trigger>
          <Popover.Popup
            className="popover"
            render={popup}
            data-state="custom"
            style={{ color: 'rgb(1, 2, 3)' }}
          >
            <Popover.Title render={<h3 />}>Share link</Popover.Title>
            <Popover.Close render={<Button />}>Done</Popover.Close>
          </Popover.Popup>
        </Popover.Root>,
      );
      const element = popover()!;
      expect(['section', 'article']).toContain(element.localName);
      expect(element.getAttribute('role')).toBe('dialog');
      expect(element.getAttribute('data-state')).toBe('open');
      expect(element.getAttribute('data-side')).toBe('bottom');
      expect(element.style.color).toBe('rgb(1, 2, 3)');
      await vi.waitFor(() =>
        expect(Number.parseFloat(element.style.top)).toBeGreaterThan(0),
      );
      await expect.element(element).toHaveAccessibleName('Share link');
      expect(share().getAttribute('aria-controls')).toBe(element.id);
      expect(button('Done').type).toBe('button');
      await userEvent.click(button('Done'));
      await closed();
      render(<></>);
    }
    if (isDevelopment) {
      expect(new Set(errors())).toEqual(
        new Set([
          'Popover.Popup: `data-state` is decided by the component and cannot be overridden.',
        ]),
      );
    }
  });

  it.runIf(isChromium)(
    'focuses the popup, not a field, when a touch opens it',
    async () => {
      render(<Page />);
      await chromiumTap(share());
      await vi.waitFor(() => expect(popover()).not.toBeNull());
      await focused(popover()!);
      await userEvent.keyboard('{Escape}');
      await closed();

      await userEvent.click(share());
      await focused(field('Link'));
      await userEvent.keyboard('{Escape}');
      await closed();
      await openByKeyboard();
      await focused(field('Link'));
    },
  );

  describe('nested', () => {
    function Nested() {
      return (
        <>
          <input aria-label="Search" />
          <Popover.Root>
            <Popover.Trigger>Share</Popover.Trigger>
            <Popover.Popup className="popover" aria-label="Share">
              <input aria-label="Link" />
              <Popover.Root>
                <Popover.Trigger>Options</Popover.Trigger>
                <Popover.Popup className="popover" aria-label="Options">
                  <button>Copy</button>
                </Popover.Popup>
              </Popover.Root>
            </Popover.Popup>
          </Popover.Root>
        </>
      );
    }

    async function openBoth() {
      await userEvent.click(share());
      await userEvent.click(button('Options'));
      await focused(button('Copy'));
    }

    it('closes one level at a time with Escape and presses inside its parent', async () => {
      render(<Nested />);
      await openBoth();
      // In its parent's portal, so it is part of the parent's layer.
      expect(
        popover('Share')!.parentElement!.contains(popover('Options')),
      ).toBe(true);

      await userEvent.keyboard('{Escape}');
      await vi.waitFor(() => expect(popover('Options')).toBeNull());
      expect(popover('Share')).not.toBeNull();
      await focused(button('Options'));
      await userEvent.keyboard('{Escape}');
      await closed();
      await focused(share());

      await openBoth();
      await userEvent.click(field('Link'));
      await vi.waitFor(() => expect(popover('Options')).toBeNull());
      expect(popover('Share')!.getAttribute('data-state')).toBe('open');
      await focused(field('Link'));
    });

    it('closes both with a press outside both', async () => {
      render(<Nested />);
      await openBoth();
      await userEvent.click(field('Search'));
      await closed();
      expect(document.activeElement).toBe(field('Search'));
    });
  });

  describe('with Dialog', () => {
    it('stays usable inside a dialog, closing before it', async () => {
      render(<Profile content={<Share />} />);
      await userEvent.click(button('Edit profile'));
      await userEvent.click(share());
      await focused(field('Link'));
      const element = popover()!;
      expect(
        dialog()!.closest('[data-floating-ui-portal]')!.contains(element),
      ).toBe(true);
      expect(element.closest('[inert]')).toBeNull();
      if (isChromium) {
        expect(await chromiumAXNode('textbox', 'Link')).toBeDefined();
      }

      await userEvent.keyboard('{Escape}');
      await closed();
      expect(dialog()).not.toBeNull();
      await focused(share());
      await userEvent.keyboard('{Escape}');
      await vi.waitFor(() => expect(dialog()).toBeNull());
      expect(errors()).toEqual([]);
    });

    it('keeps focus inside the dialog when tabbing out of it', async () => {
      render(<Profile defaultOpen content={<Share />} />);
      await focused(field('Name'));
      await openByKeyboard();
      await focused(field('Link'));
      await tab();
      await focused(button('Done'));
      await tab();
      await focused(button('Cancel'));
      await closed();
      expect(dialog()).not.toBeNull();
      await tab();
      // Wraps inside the dialog.
      await vi.waitFor(() =>
        expect(dialog()!.contains(document.activeElement)).toBe(true),
      );
    });

    it('closes with its dialog on a press outside both, and cleans up', async () => {
      render(<Profile defaultOpen content={<Share />} />);
      await userEvent.click(share());
      await focused(field('Link'));
      await pressBackdrop();
      await vi.waitFor(() => expect(dialog()).toBeNull());
      await closed();

      const app = (open: boolean) => (
        <Profile open={open} content={<Share />} />
      );
      render(app(true));
      await userEvent.click(share());
      await focused(field('Link'));
      render(app(false));
      await vi.waitFor(() => expect(dialog()).toBeNull());
      await closed();
      expect(
        document.querySelectorAll('[data-floating-ui-portal]'),
      ).toHaveLength(0);
      expect(document.querySelectorAll('[inert]')).toHaveLength(0);
    });

    it('opens a dialog above itself and closes one layer at a time', async () => {
      render(<Share content={<Profile />} />);
      await userEvent.click(share());
      await userEvent.click(button('Edit profile'));
      await focused(field('Name'));
      expect(popover()!.closest('[inert]')).not.toBeNull();

      await userEvent.keyboard('{Escape}');
      await vi.waitFor(() => expect(dialog()).toBeNull());
      expect(popover()!.getAttribute('data-state')).toBe('open');
      await focused(button('Edit profile'));

      await userEvent.click(button('Edit profile'));
      await focused(field('Name'));
      await pressBackdrop();
      await vi.waitFor(() => expect(dialog()).toBeNull());
      expect(popover()!.getAttribute('data-state')).toBe('open');

      await userEvent.keyboard('{Escape}');
      await closed();
      await focused(share());
      expect(document.querySelectorAll('[inert]')).toHaveLength(0);
    });

    it('leaves Escape to a dialog in another React root above it', async () => {
      const other = document.body.insertBefore(
        document.createElement('div'),
        document.body.firstChild,
      );
      const otherRoot = createRoot(other);
      try {
        render(<Page />);
        await userEvent.click(share());
        await focused(field('Link'));
        flushSync(() => otherRoot.render(<Profile defaultOpen />));
        await focused(field('Name'));
        expect(popover()!.closest('[inert]')).not.toBeNull();
        await userEvent.keyboard('{Escape}');
        await vi.waitFor(() => expect(dialog()).toBeNull());
        expect(popover()!.getAttribute('data-state')).toBe('open');
        await focused(field('Link'));
        await userEvent.keyboard('{Escape}');
        await closed();
        await focused(share());
        expect(document.querySelectorAll('[inert]')).toHaveLength(0);

        await userEvent.click(share());
        await focused(field('Link'));
        await userEvent.click(button('Edit profile'));
        await focused(field('Name'));
        await closed();
        await userEvent.keyboard('{Escape}');
        await vi.waitFor(() => expect(dialog()).toBeNull());
        expect(errors()).toEqual([]);
      } finally {
        otherRoot.unmount();
        other.remove();
      }
    });
  });

  describe('positioning', () => {
    function At({
      left,
      top,
      ...props
    }: ShareProps & { left: number | string; top: number | string }) {
      return (
        <div style={{ position: 'fixed', left, top }}>
          <Share {...props} />
        </div>
      );
    }

    const rects = () => ({
      trigger: share().getBoundingClientRect(),
      popup: popover()!.getBoundingClientRect(),
    });

    it('places itself by the trigger, flipping and shifting to stay in view', async () => {
      render(<At left={100} top={100} defaultOpen />);
      await vi.waitFor(() => {
        const { trigger, popup } = rects();
        expect(popup.top).toBeCloseTo(trigger.bottom, 0);
        expect(popup.left + popup.width / 2).toBeCloseTo(
          trigger.left + trigger.width / 2,
          0,
        );
      });
      const available = popover()!.style.getPropertyValue(
        '--pandorah-popover-available-height',
      );
      expect(available).toMatch(/^\d+(\.\d+)?px$/);
      expect(Number.parseFloat(available)).toBeGreaterThan(0);

      render(
        <At
          left={100}
          top={300}
          defaultOpen
          popup={{ side: 'top', align: 'start', sideOffset: 4 }}
        />,
      );
      await vi.waitFor(() => {
        const { trigger, popup } = rects();
        expect(popup.bottom).toBeCloseTo(trigger.top - 4, 0);
        expect(popup.left).toBeCloseTo(trigger.left, 0);
      });
      expect(popover()!.getAttribute('data-side')).toBe('top');
      expect(popover()!.getAttribute('data-align')).toBe('start');

      // No room below: it flips above.
      render(<At left={100} top="calc(100vh - 40px)" defaultOpen />);
      await vi.waitFor(() =>
        expect(popover()!.getAttribute('data-side')).toBe('top'),
      );
      expect(rects().popup.bottom).toBeLessThanOrEqual(rects().trigger.top + 1);

      // No room to the right: it shifts into view.
      render(
        <At
          left="calc(100vw - 60px)"
          top={100}
          defaultOpen
          popup={{ align: 'start' }}
        />,
      );
      await vi.waitFor(() =>
        expect(rects().popup.right).toBeLessThanOrEqual(
          document.documentElement.clientWidth + 1,
        ),
      );
      expect(popover()!.getAttribute('data-align')).toBe('start');
    });

    it('follows its trigger when it scrolls or is replaced', async () => {
      const app = (offset: number) => (
        <div
          data-testid="scroller"
          style={{ height: 300, overflow: 'auto', marginTop: 50 }}
        >
          <div style={{ height: 1000, paddingTop: 50 }}>
            <Popover.Root defaultOpen>
              <Popover.Trigger
                render={<button key={offset} style={{ marginLeft: offset }} />}
              >
                Share
              </Popover.Trigger>
              <Popover.Popup className="popover" aria-label="Share">
                <button>Copy</button>
              </Popover.Popup>
            </Popover.Root>
          </div>
        </div>
      );
      render(app(0));
      await vi.waitFor(() =>
        expect(rects().popup.top).toBeCloseTo(rects().trigger.bottom, 0),
      );
      const scroller = document.querySelector('[data-testid="scroller"]')!;
      scroller.scrollTop = 30;
      await vi.waitFor(() =>
        expect(rects().popup.top).toBeCloseTo(rects().trigger.bottom, 0),
      );

      const previous = share();
      render(app(120));
      expect(share()).not.toBe(previous);
      await vi.waitFor(() =>
        expect(rects().popup.left + rects().popup.width / 2).toBeCloseTo(
          rects().trigger.left + rects().trigger.width / 2,
          0,
        ),
      );
    });

    it('is placed before its first frame, without scrolling the page', async () => {
      render(
        <>
          <div style={{ height: '150vh' }} />
          <Page />
          <div style={{ height: '150vh' }} />
        </>,
      );
      share().scrollIntoView({ block: 'center' });
      const scrollY = window.scrollY;
      expect(scrollY).toBeGreaterThan(0);
      const firstFrame = new Promise<{ trigger: DOMRect; popup: DOMRect }>(
        (resolve) => {
          share().addEventListener(
            'click',
            () => requestAnimationFrame(() => resolve(rects())),
            { once: true },
          );
        },
      );
      await userEvent.click(share());
      const { trigger, popup } = await firstFrame;
      expect(popup.top).toBeCloseTo(trigger.bottom, 0);
      await focused(field('Link'));
      expect(window.scrollY).toBe(scrollY);
    });
  });

  describe('animation', () => {
    const transitions = (element: Element) =>
      element
        .getAnimations()
        .filter((animation) => animation instanceof CSSTransition);

    it('enters with @starting-style and stays mounted and inert until its exit transition ends', async () => {
      const style = document.head.appendChild(document.createElement('style'));
      style.textContent = `
        .popover { transition: opacity 400ms; }
        @starting-style { .popover[data-state="open"] { opacity: 0; } }
        .popover[data-state="closed"] { opacity: 0; }`;
      try {
        render(<Page />);
        await userEvent.click(share());
        const element = popover()!;
        expect(transitions(element)).toHaveLength(1);
        await focused(field('Link'));
        await vi.waitFor(() => expect(transitions(element)).toHaveLength(0));

        await userEvent.keyboard('{Escape}');
        expect(transitions(element)).toHaveLength(1);
        expect(element.getAttribute('data-state')).toBe('closed');
        expect(element.hasAttribute('inert')).toBe(true);
        for (const legacy of [
          'data-open',
          'data-closed',
          'data-ending-style',
        ]) {
          expect(element.hasAttribute(legacy)).toBe(false);
        }
        // Focus returns at once, not after the exit.
        await focused(share());
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
        .popover[data-state="closed"] { animation: fade-out 800ms; }`;
      try {
        render(<Page />);
        await userEvent.click(share());
        const element = popover()!;
        await focused(field('Link'));
        await userEvent.click(button('Done'));
        expect(element.getAttribute('data-state')).toBe('closed');
        await userEvent.click(share());
        expect(popover()).toBe(element);
        expect(element.getAttribute('data-state')).toBe('open');
        expect(element.hasAttribute('inert')).toBe(false);
        await focused(field('Link'));
        await settle(900);
        expect(popover()).toBe(element);

        await userEvent.keyboard('{Escape}');
        await closed();
        await focused(share());
      } finally {
        style.remove();
      }
    });
  });

  it('hydrates server HTML and works in Strict Mode', async () => {
    const app = (
      <StrictMode>
        <Share defaultOpen />
      </StrictMode>
    );
    root.unmount();
    container.innerHTML = renderToString(app);
    expect(container.querySelector('[aria-expanded="true"]')).not.toBeNull();
    expect(popover()).toBeNull();
    root = hydrateRoot(container, app);
    await vi.waitFor(() => expect(popover()).not.toBeNull());
    await focused(field('Link'));
    await userEvent.keyboard('{Escape}');
    await closed();
    await focused(share());
    await userEvent.click(share());
    await focused(field('Link'));
    await userEvent.click(button('Done'));
    await closed();
    expect(document.querySelectorAll('[data-floating-ui-portal]')).toHaveLength(
      0,
    );
    expect(errors()).toEqual([]);
  });
});
