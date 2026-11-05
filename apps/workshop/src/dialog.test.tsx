/// <reference types="@vitest/browser-playwright" />
import {
  FloatingFocusManager,
  FloatingNode,
  FloatingPortal,
  FloatingTree,
  useClick,
  useDismiss,
  useFloating,
  useFloatingNodeId,
  useInteractions,
} from '@floating-ui/react';
import {
  Button,
  Dialog,
  type ButtonProps,
  type DialogOpenChangeDetails,
  type DialogPopupProps,
  type DialogRootProps,
} from '@pandorah-ui/react';
import {
  Activity,
  createElement,
  createRef,
  StrictMode,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal, flushSync } from 'react-dom';
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
import { page, userEvent } from 'vitest/browser';

// Diagnostics are development-only; behavior is checked in both modes.
import { isDevelopment } from '../../../packages/react/src/internal/composition/diagnostics';
import {
  axProperties,
  chromiumAXNode,
  isChromium,
  mouse,
  tab,
  wheel,
} from './test/browser';

let container: HTMLDivElement;
let root: Root;
let consoleError: MockInstance<typeof console.error>;
let consoleWarn: MockInstance<typeof console.warn>;

function render(element: ReactElement) {
  flushSync(() => root.render(element));
}

function errors() {
  return consoleError.mock.calls.map((call) => String(call[0]));
}

function warnings() {
  return consoleWarn.mock.calls.map((call) => String(call[0]));
}

const styles = document.createElement('style');
styles.textContent = `
  .backdrop { position: fixed; inset: 0; display: grid; place-items: center; background: rgb(0 0 0 / 0.4); }
  .popup { box-sizing: border-box; width: 320px; padding: 16px; background: white; }`;

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
  consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  root.unmount();
  container.remove();
  document.documentElement.removeAttribute('style');
  window.scrollTo(0, 0);
  consoleError.mockRestore();
  consoleWarn.mockRestore();
});

const html = document.documentElement;
const popups = () => [
  ...document.querySelectorAll<HTMLElement>('[aria-modal="true"]'),
];
const popup = () => popups()[0] ?? null;
const trigger = () =>
  document.querySelector<HTMLButtonElement>('[aria-haspopup="dialog"]')!;
const button = (name: string) =>
  [...document.querySelectorAll('button')].find(
    (candidate) => candidate.textContent === name,
  )!;
const settle = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

/** Waits for every dialog to leave the document once it has closed. */
const closed = () => vi.waitFor(() => expect(popup()).toBeNull());

const focusInside = (element: Element) =>
  vi.waitFor(() => expect(element.contains(document.activeElement)).toBe(true));

const focused = (element: Element) =>
  vi.waitFor(() => expect(document.activeElement).toBe(element));

/** `true` when the element takes focus and is not inert. */
function usable(element: HTMLElement) {
  const previous = document.activeElement as HTMLElement | null;
  element.focus();
  const takesFocus = document.activeElement === element;
  previous?.focus();
  return takesFocus && !element.closest('[inert]');
}

/** Presses the primary button on the backdrop, just outside the popup. */
async function pressBackdrop(element = popup()!) {
  await mouse('down', element, { x: -10, y: -10 });
  await mouse('up', document.body, { x: 1, y: 1 });
}

/** The `mousedown` listeners added during the press that are still listening after it. */
async function remainingPressListeners(press: () => Promise<void>) {
  // The test runner gives the window methods of its own.
  const targets = [EventTarget.prototype, window];
  const adds = targets.map((target) => vi.spyOn(target, 'addEventListener'));
  const removes = targets.map((target) =>
    vi.spyOn(target, 'removeEventListener'),
  );
  let added: Parameters<EventTarget['addEventListener']>[];
  let removed: Parameters<EventTarget['removeEventListener']>[];
  try {
    await press();
    await settle();
  } finally {
    added = adds.flatMap((spy) => spy.mock.calls);
    removed = removes.flatMap((spy) => spy.mock.calls);
    // Also forgets the calls.
    for (const spy of [...adds, ...removes]) spy.mockRestore();
  }
  const removedListeners = new Set(
    removed
      .filter(([type]) => type === 'mousedown')
      .map(([, listener]) => listener),
  );
  return added.filter(
    ([type, listener, options]) =>
      type === 'mousedown' &&
      // Installed for good by Playwright's first mouse command in the page.
      !String(listener).includes('_hitTargetInterceptor') &&
      !removedListeners.has(listener) &&
      !(typeof options === 'object' && options.signal?.aborted),
  );
}

type OnOpenChange = Mock<
  (open: boolean, details: DialogOpenChangeDetails) => void
>;

function changes(onOpenChange: OnOpenChange) {
  return onOpenChange.mock.calls.map(([open, { reason }]) => ({
    open,
    reason,
  }));
}

const request = (open: boolean, reason: string) => ({ open, reason });

interface ProfileProps extends DialogRootProps {
  popup?: DialogPopupProps;
  content?: ReactNode;
}

function Profile({ popup, content, ...props }: ProfileProps) {
  return (
    <Dialog.Root {...props}>
      <Dialog.Trigger>Edit profile</Dialog.Trigger>
      <Dialog.Backdrop className="backdrop">
        <Dialog.Popup className="popup" {...popup}>
          <Dialog.Title>Profile</Dialog.Title>
          <Dialog.Description>Your team sees these changes.</Dialog.Description>
          <input aria-label="Name" />
          {content}
          <Dialog.Close>Cancel</Dialog.Close>
        </Dialog.Popup>
      </Dialog.Backdrop>
    </Dialog.Root>
  );
}

const name = () =>
  document.querySelector<HTMLInputElement>('[aria-label="Name"]')!;

/** A popover built like Pandorah's future floating components. */
function Popover({
  label = 'Menu',
  children,
}: {
  label?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const nodeId = useFloatingNodeId();
  const {
    refs: { setReference, setFloating },
    context,
    floatingStyles,
  } = useFloating({ nodeId, open, onOpenChange: setOpen });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useClick(context),
    useDismiss(context),
  ]);
  return (
    <FloatingNode id={nodeId}>
      <button ref={setReference} {...getReferenceProps()}>
        {label}
      </button>
      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={setFloating}
              data-testid="popover"
              style={{ ...floatingStyles, background: 'white' }}
              {...getFloatingProps()}
            >
              {children ?? <button>Item</button>}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </FloatingNode>
  );
}

const popover = () =>
  document.querySelector<HTMLElement>('[data-testid="popover"]');

describe('Dialog', () => {
  it('opens a modal dialog named and described by its title and description', async () => {
    render(<Profile />);
    expect(popup()).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().hasAttribute('aria-controls')).toBe(false);

    await userEvent.click(trigger());
    const element = popup()!;
    expect(element.localName).toBe('div');
    expect(element.getAttribute('role')).toBe('dialog');
    expect(element.getAttribute('data-state')).toBe('open');
    expect(element.parentElement!.getAttribute('data-state')).toBe('open');
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe(element.id);
    expect(trigger().hasAttribute('data-popup-open')).toBe(true);
    // Focus moves to the first tabbable element, and the page is inert.
    await focused(name());
    expect(trigger().closest('[inert]')).not.toBeNull();
    expect(usable(trigger())).toBe(false);

    const locator = page.elementLocator(element);
    await expect.element(locator).toHaveAccessibleName('Profile');
    await expect
      .element(locator)
      .toHaveAccessibleDescription('Your team sees these changes.');
    if (isChromium) {
      const node = await chromiumAXNode('dialog', 'Profile');
      expect(node?.description?.value).toBe('Your team sees these changes.');
      expect(axProperties(node, ['modal'])).toEqual({ modal: true });
      expect(await chromiumAXNode('button', 'Edit profile')).toBeUndefined();
    }
  });

  it('keeps names and descriptions the consumer gives', () => {
    render(
      <>
        <p id="hint">Saved automatically.</p>
        <Profile
          defaultOpen
          popup={{ 'aria-label': 'Edit', 'aria-describedby': 'hint' }}
        />
      </>,
    );
    const description = popup()!.querySelector('p')!;
    expect(popup()!.hasAttribute('aria-labelledby')).toBe(false);
    expect(popup()!.getAttribute('aria-describedby')).toBe(
      `hint ${description.id}`,
    );
  });

  it('closes from Close, Escape and the backdrop and returns focus to the trigger', async () => {
    const onOpenChange: OnOpenChange = vi.fn();
    render(<Profile onOpenChange={onOpenChange} />);

    trigger().focus();
    await userEvent.keyboard('{Enter}');
    await focused(name());
    await userEvent.keyboard('{Escape}');
    await closed();
    await focused(trigger());

    // WebKit does not focus a clicked button; focus still returns to it.
    await userEvent.click(trigger());
    await userEvent.click(button('Cancel'));
    await closed();
    await focused(trigger());

    await userEvent.click(trigger());
    await pressBackdrop();
    await closed();
    await focused(trigger());

    expect(changes(onOpenChange)).toEqual([
      request(true, 'trigger-press'),
      request(false, 'escape-key'),
      request(true, 'trigger-press'),
      request(false, 'close-press'),
      request(true, 'trigger-press'),
      request(false, 'outside-press'),
    ]);
    expect(onOpenChange.mock.calls[1]![1].event.type).toBe('keydown');
    expect(onOpenChange.mock.calls[5]![1].event.type).toBe('mousedown');
    expect(errors()).toEqual([]);
  });

  it('closes on a press that starts outside the popup, not one that ends there', async () => {
    const onOpenChange: OnOpenChange = vi.fn();
    render(<Profile onOpenChange={onOpenChange} />);
    await userEvent.click(trigger());
    const element = popup()!;
    const outside = { x: -10, y: -10 };

    await mouse('down', element);
    await mouse('up', element, outside);
    expect(popup()).toBe(element);

    // The press closes it before it ends.
    await mouse('down', element, outside);
    await closed();
    await mouse('up', document.body, { x: 1, y: 1 });
    expect(changes(onOpenChange)).toEqual([
      request(true, 'trigger-press'),
      request(false, 'outside-press'),
    ]);
  });

  it('closes on a press on the page when it has no backdrop', async () => {
    const onOpenChange: OnOpenChange = vi.fn();
    render(
      <Dialog.Root defaultOpen onOpenChange={onOpenChange}>
        <Dialog.Popup className="popup" aria-label="Profile">
          <button>Inside</button>
        </Dialog.Popup>
      </Dialog.Root>,
    );
    await focused(button('Inside'));
    await mouse('down', popup()!, { x: 5, y: 200 });
    await closed();
    expect(changes(onOpenChange)).toEqual([request(false, 'outside-press')]);
  });

  it('keeps an alert dialog open on a backdrop press', async () => {
    const onOpenChange: OnOpenChange = vi.fn();
    render(
      <Profile popup={{ role: 'alertdialog' }} onOpenChange={onOpenChange} />,
    );
    await userEvent.click(trigger());
    expect(popup()!.getAttribute('role')).toBe('alertdialog');
    if (isChromium) {
      expect(await chromiumAXNode('alertdialog', 'Profile')).toBeDefined();
    }
    await focused(name());

    // The press does not move focus out of the dialog either.
    await pressBackdrop();
    expect(popup()).not.toBeNull();
    expect(document.activeElement).toBe(name());
    await userEvent.keyboard('{Escape}');
    await closed();
    expect(changes(onOpenChange)).toEqual([
      request(true, 'trigger-press'),
      request(false, 'escape-key'),
    ]);
  });

  it('keeps focus in an alert dialog without a backdrop on a press on the page', async () => {
    render(
      <>
        <p>Page</p>
        <Dialog.Root defaultOpen>
          <Dialog.Popup role="alertdialog" aria-label="Discard draft">
            <button>Keep editing</button>
          </Dialog.Popup>
        </Dialog.Root>
      </>,
    );
    await focused(button('Keep editing'));
    await mouse('down', document.querySelector('p')!);
    await mouse('up', document.querySelector('p')!);
    expect(popup()).not.toBeNull();
    expect(document.activeElement).toBe(button('Keep editing'));
  });

  it('stays open, with focus inside, when a handler cancels the backdrop press', async () => {
    const onOpenChange: OnOpenChange = vi.fn();
    let veto = true;
    render(
      <Dialog.Root defaultOpen onOpenChange={onOpenChange}>
        <Dialog.Backdrop
          className="backdrop"
          onMouseDown={(event) => {
            if (veto) event.preventDefault();
          }}
        >
          <Dialog.Popup className="popup" aria-label="Profile">
            <button>Inside</button>
            <Dialog.Root defaultOpen>
              <Dialog.Backdrop
                className="backdrop"
                onMouseDown={(event) => event.preventDefault()}
              >
                <Dialog.Popup className="popup" aria-label="Nested">
                  <button>Nested action</button>
                </Dialog.Popup>
              </Dialog.Backdrop>
            </Dialog.Root>
          </Dialog.Popup>
        </Dialog.Backdrop>
      </Dialog.Root>,
    );
    await focused(button('Nested action'));
    const [outer, nested] = popups();

    // The nested backdrop cancels the press: neither dialog closes.
    await pressBackdrop(nested);
    expect(popups()).toEqual([outer, nested]);
    expect(document.activeElement).toBe(button('Nested action'));

    await userEvent.keyboard('{Escape}');
    await vi.waitFor(() => expect(popups()).toEqual([outer]));
    await focused(button('Inside'));
    // `onOpenChange` is not asked while the press is cancelled.
    await pressBackdrop(outer);
    expect(popups()).toEqual([outer]);
    expect(document.activeElement).toBe(button('Inside'));
    expect(onOpenChange).not.toHaveBeenCalled();

    veto = false;
    await pressBackdrop(outer);
    await closed();
    expect(changes(onOpenChange)).toEqual([request(false, 'outside-press')]);
  });

  it('keeps focus when a handler stops the backdrop press, and listens only during the press', async () => {
    const onOpenChange: OnOpenChange = vi.fn();
    let stop: 'propagation' | 'immediate' | undefined = 'propagation';
    render(
      <Dialog.Root onOpenChange={onOpenChange}>
        <Dialog.Trigger>Edit profile</Dialog.Trigger>
        <Dialog.Backdrop
          className="backdrop"
          onMouseDown={(event) => {
            if (stop === 'propagation') event.stopPropagation();
            if (stop === 'immediate') {
              event.nativeEvent.stopImmediatePropagation();
            }
          }}
        >
          <Dialog.Popup className="popup" aria-label="Profile">
            <input aria-label="Name" />
          </Dialog.Popup>
        </Dialog.Backdrop>
      </Dialog.Root>,
    );
    trigger().focus();
    await userEvent.keyboard('{Enter}');
    await focused(name());

    // Stopped before the dialog sees it, the press keeps it open.
    expect(await remainingPressListeners(() => pressBackdrop())).toEqual([]);
    expect(popup()).not.toBeNull();
    expect(document.activeElement).toBe(name());
    expect(changes(onOpenChange)).toEqual([request(true, 'trigger-press')]);

    // Stopped before any listener of the dialog runs, on the same element or
    // during capture: the listeners still end, and focus comes back.
    stop = 'immediate';
    expect(await remainingPressListeners(() => pressBackdrop())).toEqual([]);
    expect(popup()).not.toBeNull();
    expect(document.activeElement).toBe(name());
    stop = undefined;
    const stopDuringCapture = (event: Event) => event.stopPropagation();
    document.addEventListener('mousedown', stopDuringCapture, true);
    try {
      expect(await remainingPressListeners(() => pressBackdrop())).toEqual([]);
    } finally {
      document.removeEventListener('mousedown', stopDuringCapture, true);
    }
    expect(popup()).not.toBeNull();
    expect(document.activeElement).toBe(name());

    // The dialog closes and unmounts during the press.
    stop = undefined;
    expect(await remainingPressListeners(() => pressBackdrop())).toEqual([]);
    await closed();
    await focused(trigger());
    expect(changes(onOpenChange)).toEqual([
      request(true, 'trigger-press'),
      request(false, 'outside-press'),
    ]);
  });

  it('stays open when its content cancels Escape', async () => {
    const onOpenChange: OnOpenChange = vi.fn();
    render(
      <Profile
        onOpenChange={onOpenChange}
        content={
          <input
            aria-label="Search"
            onKeyDown={(event) => {
              if (event.key === 'Escape') event.preventDefault();
            }}
          />
        }
      />,
    );
    await userEvent.click(trigger());
    await userEvent.click(document.querySelector('[aria-label="Search"]')!);
    await userEvent.keyboard('{Escape}');
    expect(popup()).not.toBeNull();
    expect(changes(onOpenChange)).toEqual([request(true, 'trigger-press')]);
  });

  describe('controlled', () => {
    it('stays open while the parent refuses every request', async () => {
      const onOpenChange: OnOpenChange = vi.fn();
      render(<Profile open onOpenChange={onOpenChange} />);
      const element = popup()!;
      await focused(name());

      await userEvent.click(button('Cancel'));
      for (let press = 0; press < 5; press++) {
        await userEvent.keyboard('{Escape}');
      }
      // Escape still reaches the dialog with focus on the body.
      (document.activeElement as HTMLElement).blur();
      await userEvent.keyboard('{Escape}');
      name().focus();
      await pressBackdrop();
      expect(popup()).toBe(element);
      expect(document.activeElement).toBe(name());
      expect(changes(onOpenChange)).toEqual([
        request(false, 'close-press'),
        ...Array.from({ length: 6 }, () => request(false, 'escape-key')),
        request(false, 'outside-press'),
      ]);

      render(<Profile open={false} onOpenChange={onOpenChange} />);
      await closed();
      expect(onOpenChange).toHaveBeenCalledTimes(8);
    });

    it('returns focus to the element focused before it opened', async () => {
      function Toolbar() {
        const [open, setOpen] = useState(false);
        return (
          <>
            <button onClick={() => setOpen(true)}>Profile settings</button>
            <Profile open={open} onOpenChange={setOpen} />
          </>
        );
      }
      render(<Toolbar />);
      button('Profile settings').focus();
      await userEvent.keyboard('{Enter}');
      await focused(name());
      await userEvent.keyboard('{Escape}');
      await closed();
      await focused(button('Profile settings'));
    });
  });

  it('focuses initialFocus when it opens', async () => {
    function App() {
      const save = useRef<HTMLButtonElement>(null);
      return (
        <Profile
          popup={{ initialFocus: save }}
          content={<button ref={save}>Save</button>}
        />
      );
    }
    render(<App />);
    await userEvent.click(trigger());
    await focused(button('Save'));
  });

  it('opens from a composed Button unless it is pending or disabled', async () => {
    const onOpenChange: OnOpenChange = vi.fn();
    const app = (props: ButtonProps) => (
      <Dialog.Root onOpenChange={onOpenChange}>
        <Dialog.Trigger render={<Button {...props} />}>
          Edit profile
        </Dialog.Trigger>
        <Dialog.Popup aria-label="Profile">
          <Dialog.Close render={<Button />}>Cancel</Dialog.Close>
        </Dialog.Popup>
      </Dialog.Root>
    );

    render(app({ pending: true }));
    expect(trigger().getAttribute('aria-disabled')).toBe('true');
    // Playwright refuses to click a button that is aria-disabled.
    await userEvent.click(trigger(), { force: true });
    trigger().focus();
    expect(document.activeElement).toBe(trigger());
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(popup()).toBeNull();

    render(app({ disabled: true }));
    expect(trigger().disabled).toBe(true);
    trigger().click();
    expect(popup()).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();

    render(app({}));
    await userEvent.click(trigger());
    expect(popup()).not.toBeNull();
    await userEvent.click(button('Cancel'));
    await closed();
    await focused(trigger());
    expect(changes(onOpenChange)).toEqual([
      request(true, 'trigger-press'),
      request(false, 'close-press'),
    ]);
    expect(errors()).toEqual([]);
  });

  describe('focus', () => {
    const controls = (
      <>
        <h3 tabIndex={-1}>Heading</h3>
        <button>First</button>
        <button>Second</button>
        <button>Last</button>
        <div tabIndex={-1}>End</div>
      </>
    );
    const order = async (count: number, shift = false) => {
      const names: string[] = [];
      for (let press = 0; press < count; press++) {
        await tab({ shift });
        // WebKit leaves a focus guard a frame after reaching it.
        await vi.waitFor(() =>
          expect(
            document.activeElement?.hasAttribute(
              'data-floating-ui-focus-guard',
            ),
          ).toBe(false),
        );
        names.push(document.activeElement?.textContent ?? '');
      }
      return names;
    };

    it('keeps Tab and Shift+Tab inside, past elements outside the tab order', async () => {
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Popup aria-label="Settings">{controls}</Dialog.Popup>
        </Dialog.Root>,
      );
      await focused(button('First'));
      expect(await order(4)).toEqual(['Second', 'Last', 'First', 'Second']);
      button('First').focus();
      expect(await order(2, true)).toEqual(['Last', 'Second']);

      document.querySelector<HTMLElement>('h3')!.focus();
      expect(await order(1)).toEqual(['First']);
      [...document.querySelectorAll<HTMLElement>('div[tabindex]')]
        .at(-1)!
        .focus();
      expect(await order(1)).toEqual(['First']);
    });

    it('follows controls added, removed and disabled while open', async () => {
      function Settings() {
        const [extra, setExtra] = useState(false);
        const [disabled, setDisabled] = useState(false);
        return (
          <Dialog.Root defaultOpen>
            <Dialog.Popup aria-label="Settings">
              <button>First</button>
              <button onClick={() => setExtra((value) => !value)}>
                Toggle
              </button>
              <button disabled={disabled}>Last</button>
              {extra && <button>Added</button>}
              <input
                aria-label="Disable last"
                type="checkbox"
                onChange={() => setDisabled((value) => !value)}
              />
            </Dialog.Popup>
          </Dialog.Root>
        );
      }
      render(<Settings />);
      await focused(button('First'));
      await userEvent.click(button('Toggle'));
      await userEvent.click(document.querySelector('[type="checkbox"]')!);
      button('Toggle').focus();
      expect(await order(3)).toEqual(['Added', '', 'First']);

      button('Toggle').click();
      await settle();
      button('Toggle').focus();
      expect(await order(2)).toEqual(['', 'First']);
    });

    it('focuses the popup when nothing inside is tabbable', async () => {
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Popup aria-label="Saving">
            <button disabled>Save</button>
          </Dialog.Popup>
        </Dialog.Root>,
      );
      await focused(popup()!);
    });

    it('keeps focus on the popup when nothing inside is tabbable', async () => {
      function Empty() {
        const [disabled, setDisabled] = useState(false);
        return (
          <Dialog.Root defaultOpen>
            <Dialog.Popup aria-label="Saving">
              <button disabled={disabled} onClick={() => setDisabled(true)}>
                Save
              </button>
              <button disabled={disabled}>Cancel</button>
            </Dialog.Popup>
          </Dialog.Root>
        );
      }
      render(<Empty />);
      await focused(button('Save'));
      button('Save').click();
      await settle();
      for (const shift of [false, false, true]) {
        await tab({ shift });
        expect(document.activeElement).toBe(popup());
      }
    });

    it('moves focus inside on Tab after the focused control is removed', async () => {
      function Steps() {
        const [step, setStep] = useState(1);
        return (
          <Dialog.Root defaultOpen>
            <Dialog.Popup aria-label="Steps">
              <button>First</button>
              {step === 1 && (
                <button onClick={() => setStep(2)}>Continue</button>
              )}
              <button>Last</button>
            </Dialog.Popup>
          </Dialog.Root>
        );
      }
      render(<Steps />);
      await focused(button('First'));
      button('Continue').focus();
      button('Continue').click();
      await settle();
      await tab();
      expect(popup()!.contains(document.activeElement)).toBe(true);
    });
  });

  it('locks page scroll until the last nested dialog closes', async () => {
    html.style.overflow = 'auto';
    render(
      <>
        <div style={{ height: '300vh' }} />
        <Dialog.Root>
          <Dialog.Trigger>Settings</Dialog.Trigger>
          <Dialog.Popup aria-label="Settings">
            <Dialog.Root>
              <Dialog.Trigger>Advanced</Dialog.Trigger>
              <Dialog.Popup aria-label="Advanced">
                <Dialog.Close>Done</Dialog.Close>
              </Dialog.Popup>
            </Dialog.Root>
            <Dialog.Close>Close settings</Dialog.Close>
          </Dialog.Popup>
        </Dialog.Root>
      </>,
    );
    await userEvent.click(button('Settings'));
    expect(html.style.overflow).toBe('hidden');
    await userEvent.click(button('Advanced'));
    expect(popups()).toHaveLength(2);
    // The parent popup is inert while the nested one is open.
    expect(usable(button('Close settings'))).toBe(false);
    await focused(button('Done'));

    // Escape closes only the topmost dialog.
    await userEvent.keyboard('{Escape}');
    await vi.waitFor(() => expect(popups()).toHaveLength(1));
    expect(html.style.overflow).toBe('hidden');
    await focused(button('Advanced'));
    expect(usable(button('Close settings'))).toBe(true);

    await userEvent.click(button('Close settings'));
    await closed();
    expect(html.style.overflow).toBe('auto');
  });

  it('releases the page and restores focus when the popup unmounts while open', async () => {
    const app = (popup: boolean) => (
      <Dialog.Root defaultOpen>
        <Dialog.Trigger>Edit profile</Dialog.Trigger>
        {popup && (
          <Dialog.Popup aria-label="Profile">
            <button>Inside</button>
          </Dialog.Popup>
        )}
      </Dialog.Root>
    );
    render(app(true));
    await focused(button('Inside'));
    expect(html.style.overflow).toBe('hidden');
    render(app(false));
    expect(html.style.overflow).toBe('');
    expect(document.querySelectorAll('[inert]')).toHaveLength(0);
    await focused(trigger());
  });

  it('stays mounted and modal with data-state="closed" until its exit animations end', async () => {
    const style = document.head.appendChild(document.createElement('style'));
    style.textContent = `
      @keyframes fade-out { to { opacity: 0; } }
      .popup[data-state="closed"] { animation: fade-out 600ms; }
      .backdrop[data-state="closed"] { animation: fade-out 300ms; }`;
    try {
      render(<Profile />);
      await userEvent.click(trigger());
      await userEvent.click(button('Cancel'));
      const element = popup()!;
      const backdrop = element.parentElement!;
      for (const host of [element, backdrop]) {
        expect(host.getAttribute('data-state')).toBe('closed');
        for (const legacy of [
          'data-open',
          'data-closed',
          'data-ending-style',
        ]) {
          expect(host.hasAttribute(legacy)).toBe(false);
        }
      }
      expect(trigger().getAttribute('aria-expanded')).toBe('false');
      // Still modal, so the page stays inert and locked until the end.
      expect(html.style.overflow).toBe('hidden');
      expect(usable(trigger())).toBe(false);

      await closed();
      expect(backdrop.isConnected).toBe(false);
      await focused(trigger());
    } finally {
      style.remove();
    }
  });

  it('enters with @starting-style and stays mounted and modal until its exit transitions end', async () => {
    const style = document.head.appendChild(document.createElement('style'));
    style.textContent = `
      .popup { transition: opacity 600ms; }
      .backdrop { transition: background-color 300ms; }
      @starting-style {
        .popup[data-state="open"] { opacity: 0; }
      }
      .popup[data-state="closed"] { opacity: 0; }
      .backdrop[data-state="closed"] { background-color: transparent; }`;
    const transitions = (element: Element) =>
      element
        .getAnimations()
        .filter((animation) => animation instanceof CSSTransition);
    try {
      render(<Profile />);
      await userEvent.click(trigger());
      const element = popup()!;
      const backdrop = element.parentElement!;
      expect(transitions(element)).toHaveLength(1);
      await focused(name());
      await vi.waitFor(() => expect(transitions(element)).toHaveLength(0));

      await userEvent.click(button('Cancel'));
      expect(transitions(element)).toHaveLength(1);
      expect(transitions(backdrop)).toHaveLength(1);
      await settle(400);
      // The backdrop has finished; both wait for the popup's transition.
      expect(transitions(backdrop)).toHaveLength(0);
      expect(element.isConnected).toBe(true);
      expect(backdrop.isConnected).toBe(true);
      expect(element.getAttribute('data-state')).toBe('closed');
      expect(html.style.overflow).toBe('hidden');
      expect(usable(trigger())).toBe(false);

      await closed();
      expect(backdrop.isConnected).toBe(false);
      expect(html.style.overflow).toBe('');
      await focused(trigger());
    } finally {
      style.remove();
    }
  });

  it('works in Strict Mode', async () => {
    const onOpenChange: OnOpenChange = vi.fn();
    render(
      <StrictMode>
        <Profile onOpenChange={onOpenChange} />
      </StrictMode>,
    );
    await userEvent.click(trigger());
    await focused(name());
    expect(html.style.overflow).toBe('hidden');
    expect(usable(trigger())).toBe(false);
    await userEvent.keyboard('{Escape}');
    await closed();
    expect(html.style.overflow).toBe('');
    await focused(trigger());
    expect(changes(onOpenChange)).toEqual([
      request(true, 'trigger-press'),
      request(false, 'escape-key'),
    ]);
    expect(errors()).toEqual([]);
  });

  it('renders no popup on the server and opens it once hydrated', async () => {
    const app = <Profile defaultOpen />;
    const server = document.body.appendChild(document.createElement('div'));
    server.innerHTML = renderToString(app);
    // The popup mounts in a portal, which exists only on the client.
    expect(server.querySelector('[role="dialog"]')).toBeNull();

    const onRecoverableError = vi.fn();
    const hydrated = hydrateRoot(server, app, { onRecoverableError });
    await vi.waitFor(() => expect(popup()).not.toBeNull());
    const element = popup()!;
    expect(element.getAttribute('aria-labelledby')).toBe(
      element.querySelector('h2')!.id,
    );
    expect(
      server
        .querySelector('[aria-haspopup="dialog"]')!
        .getAttribute('aria-controls'),
    ).toBe(element.id);
    await focused(name());
    expect(server.closest('[inert]')).not.toBeNull();
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(errors()).toEqual([]);
    hydrated.unmount();
    server.remove();
  });

  describe('lifecycle', () => {
    it('gives up modality while hidden by Activity and takes it back when shown', async () => {
      const onOpenChange: OnOpenChange = vi.fn();
      const app = (mode: 'visible' | 'hidden') => (
        <>
          <button>Outside</button>
          <Activity mode={mode}>
            <Profile open onOpenChange={onOpenChange} />
          </Activity>
        </>
      );
      render(app('visible'));
      await focused(name());
      expect(html.style.overflow).toBe('hidden');
      expect(usable(button('Outside'))).toBe(false);

      render(app('hidden'));
      await settle();
      expect(html.style.overflow).toBe('');
      expect(document.querySelectorAll('[inert]')).toHaveLength(0);
      expect(usable(button('Outside'))).toBe(true);
      expect(onOpenChange).not.toHaveBeenCalled();

      render(app('visible'));
      await focusInside(popup()!);
      expect(html.style.overflow).toBe('hidden');
      expect(usable(button('Outside'))).toBe(false);
      await userEvent.keyboard('{Escape}');
      expect(changes(onOpenChange)).toEqual([request(false, 'escape-key')]);
      expect(errors()).toEqual([]);
    });

    it('keeps modality and Escape when the rendered element is replaced', async () => {
      const onOpenChange: OnOpenChange = vi.fn();
      function Forwarding(props: ComponentPropsWithRef<'div'>) {
        return <div {...props} />;
      }
      const app = (open: boolean, element?: ReactElement) => (
        <>
          <button>Outside</button>
          <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Trigger>Edit profile</Dialog.Trigger>
            <Dialog.Popup aria-label="Profile" render={element}>
              <input aria-label="Name" />
            </Dialog.Popup>
          </Dialog.Root>
        </>
      );
      render(app(true));
      await focused(name());
      for (const element of [
        <section />,
        <Forwarding />,
        <div key="first" />,
        <div key="second" />,
      ]) {
        const previous = popup()!;
        render(app(true, element));
        await settle();
        expect(popup()).not.toBe(previous);
        expect(popups()).toHaveLength(1);
        expect(usable(button('Outside'))).toBe(false);
        expect(trigger().getAttribute('aria-expanded')).toBe('true');
        expect(html.style.overflow).toBe('hidden');
      }
      expect(onOpenChange).not.toHaveBeenCalled();
      name().focus();
      await userEvent.keyboard('{Escape}');
      expect(changes(onOpenChange)).toEqual([request(false, 'escape-key')]);

      render(app(false, <div key="second" />));
      await closed();
      expect(html.style.overflow).toBe('');
      expect(usable(button('Outside'))).toBe(true);
      expect(errors()).toEqual([]);
    });

    function Layers({
      depth,
      onOpenChange,
    }: {
      depth: number;
      onOpenChange: (layer: string, open: boolean, reason: string) => void;
    }) {
      return ['Outer', 'Middle', 'Inner']
        .slice(0, depth)
        .reduceRight<ReactNode>(
          (content, layer) => (
            <Dialog.Root
              defaultOpen
              onOpenChange={(open, { reason }) =>
                onOpenChange(layer, open, reason)
              }
            >
              <Dialog.Trigger>{layer}</Dialog.Trigger>
              <Dialog.Popup aria-label={layer}>
                <button>{layer} action</button>
                {content}
              </Dialog.Popup>
            </Dialog.Root>
          ),
          null,
        );
    }

    it.each([
      { depth: 2, innermost: 'Middle', below: 'Outer' },
      { depth: 3, innermost: 'Inner', below: 'Middle' },
    ])(
      'opens $depth nested dialogs together, innermost on top',
      async ({ depth, innermost, below }) => {
        const onOpenChange = vi.fn();
        render(<Layers depth={depth} onOpenChange={onOpenChange} />);
        expect(popups()).toHaveLength(depth);
        await focused(button(`${innermost} action`));
        expect(usable(button(`${below} action`))).toBe(false);

        // Escape belongs to the topmost dialog, and focus returns into the
        // one below it.
        await userEvent.keyboard('{Escape}');
        await vi.waitFor(() => expect(popups()).toHaveLength(depth - 1));
        expect(onOpenChange.mock.calls.map(([layer]) => layer)).toEqual([
          innermost,
        ]);
        const remaining = popups().at(-1)!;
        expect(remaining.getAttribute('aria-label')).toBe(below);
        await focusInside(remaining);
        expect(usable(button(`${below} action`))).toBe(true);
      },
    );

    it('releases everything when nested dialogs are hidden or unmounted', async () => {
      const onOpenChange = vi.fn();
      const app = (mode: 'visible' | 'hidden') => (
        <Activity mode={mode}>
          <Layers depth={3} onOpenChange={onOpenChange} />
        </Activity>
      );
      render(app('visible'));
      render(app('hidden'));
      await settle();
      expect(document.querySelectorAll('[inert]')).toHaveLength(0);
      expect(html.style.overflow).toBe('');

      // Shown again, effects run innermost first; the innermost stays on top.
      render(app('visible'));
      await focused(button('Inner action'));
      expect(html.style.overflow).toBe('hidden');
      expect(usable(button('Inner action'))).toBe(true);
      expect(usable(button('Middle action'))).toBe(false);
      expect(usable(button('Outer action'))).toBe(false);

      render(<></>);
      await settle();
      expect(popups()).toHaveLength(0);
      expect(document.querySelectorAll('[inert]')).toHaveLength(0);
      expect(html.style.overflow).toBe('');
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(errors()).toEqual([]);
    });

    it('keeps the page from scrolling until its exit animation ends', async () => {
      const style = document.head.appendChild(document.createElement('style'));
      style.textContent = `
        @keyframes fade-out { to { opacity: 0; } }
        .popup[data-state="closed"] { animation: fade-out 800ms; }`;
      try {
        render(
          <>
            <Profile />
            <div style={{ height: '300vh' }} />
          </>,
        );
        await userEvent.click(trigger());
        await userEvent.click(button('Cancel'));
        const element = popup()!;
        expect(window.scrollY).toBe(0);
        await wheel(element, { x: -10, y: -10 }, 400);
        await settle(150);
        expect(window.scrollY).toBe(0);
        expect(html.style.overflow).toBe('hidden');

        await closed();
        expect(html.style.overflow).toBe('');
        await wheel(document.body, { x: 20, y: 20 }, 400);
        await vi.waitFor(() => expect(window.scrollY).toBeGreaterThan(0));
      } finally {
        style.remove();
      }
    });

    it('stays modal when reopened during its exit animation', async () => {
      const style = document.head.appendChild(document.createElement('style'));
      style.textContent = `
        @keyframes fade-out { to { opacity: 0; } }
        .popup[data-state="closed"] { animation: fade-out 800ms; }`;
      try {
        const onOpenChange: OnOpenChange = vi.fn();
        const app = (open: boolean) => (
          <Profile open={open} onOpenChange={onOpenChange} />
        );
        render(app(true));
        const element = popup()!;
        render(app(false));
        expect(element.getAttribute('data-state')).toBe('closed');
        render(app(true));
        await settle(900);
        expect(popup()).toBe(element);
        expect(element.getAttribute('data-state')).toBe('open');
        expect(element.parentElement!.getAttribute('data-state')).toBe('open');
        expect(html.style.overflow).toBe('hidden');
        expect(usable(trigger())).toBe(false);

        render(app(false));
        await closed();
        expect(html.style.overflow).toBe('');
        expect(onOpenChange).not.toHaveBeenCalled();
      } finally {
        style.remove();
      }
    });
  });

  describe('composition', () => {
    it('registers the ids a composed title and description render', async () => {
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Popup>
            <Dialog.Title render={<h3 id="profile-title" />}>
              Profile
            </Dialog.Title>
            <Dialog.Description render={<div id="profile-description" />}>
              Your team sees these changes.
            </Dialog.Description>
          </Dialog.Popup>
        </Dialog.Root>,
      );
      const element = popup()!;
      expect(element.getAttribute('aria-labelledby')).toBe('profile-title');
      expect(element.getAttribute('aria-describedby')).toBe(
        'profile-description',
      );
      await expect
        .element(page.elementLocator(element))
        .toHaveAccessibleName('Profile');
      await expect
        .element(page.elementLocator(element))
        .toHaveAccessibleDescription('Your team sees these changes.');
      if (isChromium) {
        const node = await chromiumAXNode('dialog', 'Profile');
        expect(node?.description?.value).toBe('Your team sees these changes.');
      }
      expect(errors()).toEqual([]);
    });

    it('renders the popup as the element a component or a custom element renders', async () => {
      function Card(props: ComponentPropsWithRef<'section'>) {
        return <section data-card {...props} />;
      }
      for (const element of [
        <section />,
        <Card />,
        createElement('profile-panel'),
      ]) {
        render(
          <Dialog.Root defaultOpen>
            <Dialog.Popup aria-label="Profile" render={element}>
              <button>Inside</button>
            </Dialog.Popup>
          </Dialog.Root>,
        );
        expect(popup()!.localName).toBe(
          element.type === Card ? 'section' : element.type,
        );
        expect(popup()!.getAttribute('role')).toBe('dialog');
        await focused(button('Inside'));
        render(<></>);
        await closed();
      }
      expect(errors()).toEqual([]);
    });

    it('sets data-state on composed hosts, which consumers cannot override', async () => {
      const style = document.head.appendChild(document.createElement('style'));
      style.textContent = `
        @keyframes fade-out { to { opacity: 0; } }
        [data-overlay][data-state="closed"] { animation: fade-out 300ms; }`;
      function Overlay(props: ComponentPropsWithRef<'div'>) {
        return <div data-overlay {...props} />;
      }
      const app = (open: boolean) => (
        <Dialog.Root open={open}>
          <Dialog.Trigger>Edit profile</Dialog.Trigger>
          <Dialog.Backdrop
            className="backdrop"
            render={<Overlay data-state="dimmed" />}
          >
            <Dialog.Popup
              aria-label="Profile"
              data-state="editing"
              render={(props) => <section {...props} />}
            >
              <button>Inside</button>
            </Dialog.Popup>
          </Dialog.Backdrop>
        </Dialog.Root>
      );
      try {
        render(app(true));
        const element = popup()!;
        const backdrop = element.parentElement!;
        expect(element.localName).toBe('section');
        expect(backdrop.hasAttribute('data-overlay')).toBe(true);
        expect(element.getAttribute('data-state')).toBe('open');
        expect(backdrop.getAttribute('data-state')).toBe('open');
        await focused(button('Inside'));

        render(app(false));
        expect(element.getAttribute('data-state')).toBe('closed');
        expect(backdrop.getAttribute('data-state')).toBe('closed');
        expect(usable(trigger())).toBe(false);
        await closed();
        expect(backdrop.isConnected).toBe(false);
      } finally {
        style.remove();
      }
      if (isDevelopment) {
        expect(new Set(errors())).toEqual(
          new Set([
            'Dialog.Backdrop: `data-state` is decided by the component and cannot be overridden.',
            'Dialog.Popup: `data-state` is decided by the component and cannot be overridden.',
          ]),
        );
      }
    });

    it('reports a composed host that replaces data-state', async () => {
      function Busy(props: ComponentPropsWithRef<'div'>) {
        return <div {...props} data-state="busy" />;
      }
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Popup aria-label="Profile" render={<Busy />}>
            <button>Inside</button>
          </Dialog.Popup>
        </Dialog.Root>,
      );
      await focused(button('Inside'));
      expect(popup()!.getAttribute('data-state')).toBe('busy');
      if (isDevelopment) {
        expect(errors()).toEqual([
          'Dialog.Popup: the render element did not pass `data-state` to its DOM element.',
        ]);
      }
    });

    it('shows nothing and leaves the page usable for a <dialog> host, even an open one', async () => {
      for (const element of [<dialog />, <dialog open />]) {
        render(
          <>
            <button>Outside</button>
            <Dialog.Root defaultOpen>
              <Dialog.Popup aria-label="Profile" render={element}>
                <button>Inside</button>
              </Dialog.Popup>
            </Dialog.Root>
          </>,
        );
        await settle();
        expect(document.querySelector('dialog')).toBeNull();
        expect(document.querySelectorAll('[inert]')).toHaveLength(0);
        expect(html.style.overflow).toBe('');
        expect(usable(button('Outside'))).toBe(true);
        render(<></>);
      }
      if (isDevelopment) {
        expect(
          errors().filter((error) =>
            error.endsWith('The dialog is not shown.'),
          ),
        ).toEqual(
          Array(2).fill(
            'Dialog.Popup: rendered <dialog>, which cannot hold a modal dialog. Render a <div>, a <section> or a custom element. The dialog is not shown.',
          ),
        );
      }
    });

    it('opens from another trigger element, except while its disabled prop is set', async () => {
      const onOpenChange: OnOpenChange = vi.fn();
      const app = (disabled: boolean) => (
        <Dialog.Root onOpenChange={onOpenChange}>
          <Dialog.Trigger
            disabled={disabled}
            render={<span role="button" tabIndex={0} />}
          >
            Edit profile
          </Dialog.Trigger>
          <Dialog.Popup aria-label="Profile">
            <Dialog.Close
              disabled={disabled}
              render={<span role="button" data-close />}
            >
              Done
            </Dialog.Close>
            <button>Inside</button>
          </Dialog.Popup>
        </Dialog.Root>
      );
      render(app(true));
      expect(trigger().localName).toBe('span');
      expect(trigger().hasAttribute('type')).toBe(false);
      expect(document.querySelector('[data-close]')).toBeNull();
      trigger().click();
      await settle();
      expect(popup()).toBeNull();

      render(app(false));
      await userEvent.click(trigger());
      await focused(button('Inside'));
      expect(document.querySelector('[data-close]')!.hasAttribute('type')).toBe(
        false,
      );
      render(app(true));
      document.querySelector<HTMLElement>('[data-close]')!.click();
      await settle();
      expect(popup()).not.toBeNull();
      render(app(false));
      document.querySelector<HTMLElement>('[data-close]')!.click();
      await closed();
      expect(changes(onOpenChange)).toEqual([
        request(true, 'trigger-press'),
        request(false, 'close-press'),
      ]);
      expect(errors()).toEqual([]);
    });

    it('gives the trigger and the close button type="button", or the type passed to them', async () => {
      const app = (type?: 'submit' | 'reset') => (
        <Dialog.Root defaultOpen>
          <Dialog.Trigger type={type}>Edit profile</Dialog.Trigger>
          <Dialog.Popup aria-label="Profile">
            <Dialog.Close type={type}>Done</Dialog.Close>
          </Dialog.Popup>
        </Dialog.Root>
      );
      render(app());
      await focused(button('Done'));
      expect(trigger().getAttribute('type')).toBe('button');
      expect(button('Done').getAttribute('type')).toBe('button');

      render(app('submit'));
      expect(trigger().getAttribute('type')).toBe('submit');
      expect(button('Done').getAttribute('type')).toBe('submit');
      expect(errors()).toEqual([]);
    });

    it('keeps the role it decides, so semantics and the backdrop agree', async () => {
      const onOpenChange: OnOpenChange = vi.fn();
      render(
        <Dialog.Root defaultOpen onOpenChange={onOpenChange}>
          <Dialog.Backdrop className="backdrop">
            <Dialog.Popup
              className="popup"
              aria-label="Discard draft"
              role="alertdialog"
              render={<div role="dialog" />}
            >
              <button>Keep editing</button>
            </Dialog.Popup>
          </Dialog.Backdrop>
        </Dialog.Root>,
      );
      expect(popup()!.getAttribute('role')).toBe('alertdialog');
      await pressBackdrop();
      expect(popup()).not.toBeNull();
      expect(onOpenChange).not.toHaveBeenCalled();
      if (isDevelopment)
        expect(errors()).toContain(
          'Dialog.Popup: `role` is decided by the component and cannot be overridden.',
        );
    });
  });

  describe('fail-closed composition', () => {
    function Dropping({
      attribute,
      ...props
    }: ComponentPropsWithRef<'div'> & { attribute: string }) {
      const kept: Record<string, unknown> = { ...props };
      delete kept[attribute];
      return <div {...kept} />;
    }

    const app = (open: boolean, element?: ReactElement) => (
      <>
        <button>Outside</button>
        <Dialog.Root open={open}>
          <Dialog.Trigger>Edit profile</Dialog.Trigger>
          <Dialog.Backdrop className="backdrop" data-testid="backdrop">
            <Dialog.Popup
              className="popup"
              aria-label="Profile"
              render={element}
            >
              <button>Inside</button>
            </Dialog.Popup>
          </Dialog.Backdrop>
        </Dialog.Root>
      </>
    );
    const backdrop = () => document.querySelector('[data-testid="backdrop"]');
    const notShown = () =>
      errors().filter((error) => error.endsWith('The dialog is not shown.'));

    it('shows nothing and leaves the page usable when the host drops the ref', async () => {
      render(app(false));
      button('Outside').focus();
      render(app(true, <Dropping attribute="ref" />));
      await settle();
      expect(document.querySelector('[aria-label="Profile"]')).toBeNull();
      expect(backdrop()).toBeNull();
      expect(document.querySelectorAll('[inert]')).toHaveLength(0);
      expect(html.style.overflow).toBe('');
      expect(document.activeElement).toBe(button('Outside'));
      if (isDevelopment) {
        expect(errors()).toEqual([
          'Dialog.Popup: the render element did not attach the ref. It must render a component that passes `ref` and its props to a DOM element.',
        ]);
      }
    });

    it('hides a popup whose host breaks while open, and shows it again when reopened valid', async () => {
      render(app(true));
      await focused(button('Inside'));
      expect(backdrop()).not.toBeNull();

      render(app(true, <Dropping attribute="ref" />));
      await settle();
      expect(popup()).toBeNull();
      expect(backdrop()).toBeNull();
      expect(document.querySelectorAll('[inert]')).toHaveLength(0);
      expect(html.style.overflow).toBe('');

      render(app(false));
      await settle();
      render(app(true));
      await focused(button('Inside'));
      expect(backdrop()).not.toBeNull();
      expect(usable(button('Outside'))).toBe(false);
    });

    /** A host that stops attaching the ref after an update of its own. */
    function Unstable({
      detachRef,
      ref,
      ...props
    }: ComponentPropsWithRef<'div'> & {
      detachRef: RefObject<(() => void) | null>;
    }) {
      const [detached, setDetached] = useState(false);
      useImperativeHandle(detachRef, () => () => setDetached(true), []);
      return <div {...props} ref={detached ? undefined : ref} />;
    }

    it('hides the popup when its render component detaches the ref on its own', async () => {
      const detachRef = createRef<() => void>();
      render(app(true, <Unstable detachRef={detachRef} />));
      await focused(button('Inside'));
      flushSync(() => detachRef.current!());
      await settle();
      expect(document.querySelector('[aria-label="Profile"]')).toBeNull();
      expect(backdrop()).toBeNull();
      expect(document.querySelectorAll('[inert]')).toHaveLength(0);
      expect(usable(button('Outside'))).toBe(true);
    });

    it.each(['role', 'aria-modal', 'id'])(
      'stays modal, and reports it in development, when the host drops %s',
      async (attribute) => {
        render(app(true, <Dropping attribute={attribute} />));
        await focused(button('Inside'));
        expect(popup() ?? document.querySelector('.popup')).not.toBeNull();
        expect(usable(button('Outside'))).toBe(false);
        expect(notShown()).toEqual([]);
        if (isDevelopment) {
          expect(errors()).toContain(
            `Dialog.Popup: the render element did not pass \`${attribute}\` to its DOM element.`,
          );
        }
      },
    );
  });

  describe('strict modality', () => {
    function Page({
      open,
      nested = false,
      children,
    }: {
      open: boolean;
      nested?: boolean;
      children?: ReactNode;
    }) {
      return (
        <>
          <div role="status">Saved</div>
          <div inert>
            <button>Inert by author</button>
          </div>
          <button>Outside</button>
          <Dialog.Root open={open}>
            <Dialog.Backdrop className="backdrop">
              <Dialog.Popup className="popup" aria-label="Isolation">
                <button>First</button>
                {children}
                <Dialog.Root open={nested}>
                  <Dialog.Popup aria-label="Nested">
                    <button>Nested action</button>
                  </Dialog.Popup>
                </Dialog.Root>
              </Dialog.Popup>
            </Dialog.Backdrop>
          </Dialog.Root>
        </>
      );
    }

    function addButton(name: string, parent: Element = document.body) {
      const element = document.createElement('button');
      element.textContent = name;
      parent.append(element);
      return element;
    }

    function exempt(markup = '<button>Undo</button>') {
      const element = document.createElement('div');
      element.setAttribute('data-pandorah-modal-exempt', '');
      element.innerHTML = markup;
      return document.body.appendChild(element);
    }

    it('makes live regions and content added later inert, except in an exempt top-level container', async () => {
      const toasts = exempt(
        '<div role="status">Exempt status</div><button>Undo</button>',
      );
      const deep = document.createElement('div');
      deep.setAttribute('data-pandorah-modal-exempt', '');
      deep.innerHTML = '<button>Deep</button>';
      try {
        render(<Page open={false} />);
        button('Outside').after(deep);
        render(<Page open />);
        await focused(button('First'));

        const status = document.querySelector<HTMLElement>(
          '[role="status"]:not([data-pandorah-modal-exempt] *)',
        )!;
        expect(status.closest('[inert]')).not.toBeNull();
        expect(usable(button('Inert by author'))).toBe(false);
        expect(usable(button('Undo'))).toBe(true);
        expect(usable(button('Deep'))).toBe(false);
        expect(usable(button('Outside'))).toBe(false);
        if (isChromium) {
          expect(await chromiumAXNode('button', 'Outside')).toBeUndefined();
          expect(await chromiumAXNode('button', 'Undo')).toBeDefined();
        }

        const late = addButton('Late');
        const insideApp = addButton('Inside app', container);
        const alert = document.createElement('div');
        alert.setAttribute('role', 'alert');
        alert.textContent = 'Late alert';
        document.body.append(alert);
        const toast = addButton('Late toast', toasts);
        await settle();
        expect(usable(late)).toBe(false);
        expect(usable(insideApp)).toBe(false);
        expect(alert.closest('[inert]')).not.toBeNull();
        expect(usable(toast)).toBe(true);
        if (isDevelopment)
          expect(warnings()).toContain(
            'Dialog: made <button> inert because it was added outside the open dialog. Render it inside the popup (a portal container), or mark its top-level container with `data-pandorah-modal-exempt` to keep it usable.',
          );
        if (isChromium) {
          expect(await chromiumAXNode('button', 'Late')).toBeUndefined();
        }

        popup()!.append(late);
        await settle();
        expect(usable(late)).toBe(true);
        document.body.append(late);
        await settle();
        expect(usable(late)).toBe(false);
        late.remove();
        document.body.prepend(late);
        await settle();
        expect(usable(late)).toBe(false);

        render(<Page open nested />);
        await focused(button('Nested action'));
        const lateNested = addButton('Late nested');
        await settle();
        expect(usable(lateNested)).toBe(false);
        expect(usable(button('First'))).toBe(false);
        expect(usable(button('Nested action'))).toBe(true);

        render(<Page open />);
        await vi.waitFor(() => expect(popups()).toHaveLength(1));
        expect(usable(lateNested)).toBe(false);
        expect(usable(button('First'))).toBe(true);

        render(<Page open={false} />);
        await closed();
        for (const element of [
          late,
          lateNested,
          insideApp,
          button('Outside'),
        ]) {
          expect(usable(element)).toBe(true);
        }
        expect(alert.closest('[inert]')).toBeNull();
        expect(status.closest('[inert]')).toBeNull();
        expect(
          [...document.querySelectorAll('[inert]')].map(
            (element) => element.textContent,
          ),
        ).toEqual(['Inert by author']);
        late.remove();
        lateNested.remove();
        alert.remove();
      } finally {
        toasts.remove();
        deep.remove();
      }
    });

    it('does not exempt a container that holds the element that opened the dialog', async () => {
      const app = exempt('');
      const appRoot = createRoot(app);
      try {
        flushSync(() =>
          appRoot.render(
            <Dialog.Root>
              <button>Undo</button>
              <Dialog.Trigger>Edit profile</Dialog.Trigger>
              <Dialog.Popup aria-label="Profile">
                <button>Inside</button>
              </Dialog.Popup>
            </Dialog.Root>,
          ),
        );
        trigger().focus();
        await userEvent.keyboard('{Enter}');
        await focused(button('Inside'));
        expect(usable(button('Undo'))).toBe(false);
        await userEvent.keyboard('{Escape}');
        await closed();
        expect(usable(button('Undo'))).toBe(true);

        // A real press, which in WebKit leaves the trigger unfocused.
        await userEvent.click(trigger());
        await focused(button('Inside'));
        expect(usable(button('Undo'))).toBe(false);
        await userEvent.keyboard('{Escape}');
        await closed();
        expect(usable(button('Undo'))).toBe(true);
      } finally {
        appRoot.unmount();
        app.remove();
      }
    });

    it('keeps the page inert when a script makes it usable again, and refuses focus before the observer runs', async () => {
      const banner = document.body.appendChild(document.createElement('div'));
      banner.innerHTML = '<button>Banner</button>';
      const changes: MutationRecord[] = [];
      const watcher = new MutationObserver((records) =>
        changes.push(...records),
      );
      try {
        render(<Page open />);
        await focused(button('First'));
        // Pandorah alone marks the page; Floating UI marks nothing.
        expect(document.querySelector('[data-floating-ui-inert]')).toBeNull();
        expect(container.hasAttribute('inert')).toBe(true);
        expect(banner.hasAttribute('inert')).toBe(true);

        watcher.observe(container, { attributeFilter: ['inert'] });
        container.removeAttribute('inert');
        button('Outside').focus();
        expect(document.activeElement).toBe(button('First'));
        const late = addButton('Late');
        late.focus();
        expect(document.activeElement).toBe(button('First'));
        await settle();
        expect(container.hasAttribute('inert')).toBe(true);
        expect(usable(button('Outside'))).toBe(false);
        expect(usable(late)).toBe(false);
        // Restored once, without a loop of writes.
        expect(changes).toHaveLength(2);

        // The author's own inertness is theirs to keep or drop.
        button('Inert by author').parentElement!.removeAttribute('inert');
        banner.inert = true;
        await settle();
        expect(usable(button('Inert by author'))).toBe(false);

        // An element moved into the dialog is usable there, and inert again
        // once it leaves.
        const widget = document.body.appendChild(document.createElement('div'));
        widget.innerHTML = '<button>Widget</button>';
        await settle();
        expect(usable(button('Widget'))).toBe(false);
        popup()!.append(widget);
        await settle();
        expect(usable(button('Widget'))).toBe(true);
        document.body.append(widget);
        await settle();
        expect(usable(button('Widget'))).toBe(false);

        render(<Page open={false} />);
        await closed();
        expect(usable(button('Outside'))).toBe(true);
        expect(usable(button('Inert by author'))).toBe(true);
        expect(usable(late)).toBe(true);
        expect(usable(button('Widget'))).toBe(true);
        expect(banner.hasAttribute('inert')).toBe(true);
        late.remove();
        widget.remove();
      } finally {
        watcher.disconnect();
        banner.remove();
      }
    });

    it('isolates a container again when its exemption is removed while open', async () => {
      const toasts = exempt();
      const undo = toasts.querySelector('button')!;
      const pressed = vi.fn();
      undo.addEventListener('mousedown', pressed);
      const press = async () => {
        await mouse('down', undo);
        await mouse('up', undo);
      };
      try {
        render(
          <Dialog.Root open>
            <Dialog.Popup aria-label="Profile">
              <button>Inside</button>
            </Dialog.Popup>
          </Dialog.Root>,
        );
        await focused(button('Inside'));
        expect(toasts.hasAttribute('inert')).toBe(false);

        // Nothing else changes in the page: the attribute alone is observed.
        toasts.removeAttribute('data-pandorah-modal-exempt');
        await settle();
        expect(toasts.hasAttribute('inert')).toBe(true);
        expect(usable(undo)).toBe(false);
        await press();
        expect(pressed).not.toHaveBeenCalled();
        if (isChromium) {
          expect(await chromiumAXNode('button', 'Undo')).toBeUndefined();
        }

        toasts.setAttribute('data-pandorah-modal-exempt', '');
        await settle();
        expect(toasts.hasAttribute('inert')).toBe(false);
        expect(usable(undo)).toBe(true);
        await press();
        expect(pressed).toHaveBeenCalledTimes(1);
        if (isChromium) {
          expect(await chromiumAXNode('button', 'Undo')).toBeDefined();
        }

        render(<></>);
        expect(document.querySelectorAll('[inert]')).toHaveLength(0);
      } finally {
        toasts.remove();
      }
    });

    it('keeps the inertness an author sets just before the dialog unmounts at once', async () => {
      const banner = document.body.appendChild(document.createElement('div'));
      try {
        render(<Page open />);
        await focused(button('First'));
        expect(banner.hasAttribute('inert')).toBe(true);

        banner.inert = true;
        render(<></>);
        expect(banner.hasAttribute('inert')).toBe(true);
        expect(container.hasAttribute('inert')).toBe(false);
      } finally {
        banner.remove();
      }
    });

    it('keeps the inertness a script sets while the dialog writes its own', async () => {
      // Reacts to `inert` synchronously, from inside the dialog's own write.
      class InertFollower extends HTMLElement {
        static observedAttributes = ['inert'];
        leader?: HTMLElement;
        attributeChangedCallback() {
          if (this.inert && this.leader) this.leader.inert = true;
        }
      }
      if (!customElements.get('inert-follower')) {
        customElements.define('inert-follower', InertFollower);
      }
      const banner = document.body.appendChild(document.createElement('div'));
      const follower = document.body.appendChild(
        document.createElement('inert-follower'),
      ) as InertFollower;
      follower.leader = banner;
      try {
        render(<Page open />);
        await focused(button('First'));
        expect(follower.hasAttribute('inert')).toBe(true);

        render(<Page open={false} />);
        await closed();
        expect(banner.hasAttribute('inert')).toBe(true);
        expect(follower.hasAttribute('inert')).toBe(false);
      } finally {
        banner.remove();
        follower.remove();
      }
    });

    it('makes inert what a script adds to the page while the dialog writes its own inertness', async () => {
      // Appends to the body synchronously, from inside the dialog's own write.
      class InertAppender extends HTMLElement {
        static observedAttributes = ['inert'];
        appended?: HTMLButtonElement;
        attributeChangedCallback() {
          if (!this.inert || this.appended) return;
          this.appended = document.createElement('button');
          this.appended.textContent = 'Appended';
          document.body.append(this.appended);
        }
      }
      if (!customElements.get('inert-appender')) {
        customElements.define('inert-appender', InertAppender);
      }
      const appender = document.createElement(
        'inert-appender',
      ) as InertAppender;
      const onClick = vi.fn();
      const app = (open: boolean) => (
        <Dialog.Root open={open}>
          <Dialog.Popup role="alertdialog" aria-label="Confirm">
            <button>Confirm</button>
          </Dialog.Popup>
        </Dialog.Root>
      );
      try {
        render(app(true));
        await focused(button('Confirm'));
        document.body.append(appender);
        await vi.waitFor(() => expect(appender.appended).toBeDefined());
        await settle();
        const appended = appender.appended!;
        appended.addEventListener('click', onClick);

        expect(appended.hasAttribute('inert')).toBe(true);
        expect(usable(appended)).toBe(false);
        await mouse('down', appended);
        await mouse('up', appended);
        expect(onClick).not.toHaveBeenCalled();
        expect(document.activeElement).toBe(button('Confirm'));
        if (isChromium) {
          expect(await chromiumAXNode('button', 'Appended')).toBeUndefined();
        }

        render(app(false));
        await closed();
        expect(appended.hasAttribute('inert')).toBe(false);
        expect(appender.hasAttribute('inert')).toBe(false);
      } finally {
        appender.appended?.remove();
        appender.remove();
      }
    });

    it('keeps the inertness a script claims on an element as the dialog makes it inert', async () => {
      // Claims the attribute synchronously, from inside the dialog's own write.
      class InertClaimer extends HTMLElement {
        static observedAttributes = ['inert'];
        claimed = false;
        attributeChangedCallback() {
          if (!this.inert || this.claimed) return;
          this.claimed = true;
          this.inert = true;
        }
      }
      if (!customElements.get('inert-claimer')) {
        customElements.define('inert-claimer', InertClaimer);
      }
      const claimer = document.body.appendChild(
        document.createElement('inert-claimer'),
      ) as InertClaimer;
      const banner = document.body.appendChild(document.createElement('div'));
      try {
        render(<Page open nested />);
        await focused(button('Nested action'));
        expect(claimer.claimed).toBe(true);
        expect(banner.hasAttribute('inert')).toBe(true);

        render(<Page open />);
        await focused(button('First'));
        expect(claimer.hasAttribute('inert')).toBe(true);
        expect(banner.hasAttribute('inert')).toBe(true);

        render(<></>);
        expect(claimer.hasAttribute('inert')).toBe(true);
        expect(banner.hasAttribute('inert')).toBe(false);
        expect(container.hasAttribute('inert')).toBe(false);
      } finally {
        claimer.remove();
        banner.remove();
      }
    });

    describe('script that reacts to inert', () => {
      /** Runs `react` whenever the element receives `inert`. */
      function defineReacting(name: string) {
        class Reacting extends HTMLElement {
          static observedAttributes = ['inert'];
          received = 0;
          react?: (element: Reacting) => void;
          attributeChangedCallback() {
            if (!this.inert) return;
            this.received++;
            this.react?.(this);
          }
        }
        if (!customElements.get(name)) customElements.define(name, Reacting);
        return () => document.createElement(name) as Reacting;
      }
      const createReacting = defineReacting('inert-reacting');
      type Reacting = ReturnType<typeof createReacting>;

      const alert = (open: boolean) => (
        <Dialog.Root open={open}>
          <Dialog.Popup role="alertdialog" aria-label="Confirm">
            <button>Confirm</button>
          </Dialog.Popup>
        </Dialog.Root>
      );

      function withButton(element: Reacting, name: string) {
        const contained = document.createElement('button');
        contained.textContent = name;
        element.append(contained);
        return contained;
      }

      it('restores the page when the script unmounts the dialog as it is made inert', async () => {
        const alertContainer = document.body.appendChild(
          document.createElement('div'),
        );
        const alertRoot = createRoot(alertContainer);
        const banner = document.body.appendChild(document.createElement('div'));
        const unmounter = createReacting();
        unmounter.react = () => {
          unmounter.react = undefined;
          flushSync(() => alertRoot.unmount());
        };
        const behind = document.createElement('button');
        behind.textContent = 'Behind';
        try {
          flushSync(() => alertRoot.render(alert(true)));
          await focused(button('Confirm'));
          banner.inert = true;
          await settle();

          const fragment = document.createDocumentFragment();
          fragment.append(unmounter, behind);
          document.body.append(fragment);
          await settle();

          expect(popup()).toBeNull();
          expect(unmounter.received).toBe(1);
          expect(unmounter.hasAttribute('inert')).toBe(false);
          expect(usable(behind)).toBe(true);
          expect([...document.querySelectorAll('[inert]')]).toEqual([banner]);
          expect(html.style.overflow).toBe('');
        } finally {
          alertRoot.unmount();
          alertContainer.remove();
          banner.remove();
          unmounter.remove();
          behind.remove();
        }
      });

      it('makes inert again an element whose script removes it once', async () => {
        const remover = createReacting();
        remover.react = (element) => {
          remover.react = undefined;
          element.inert = false;
        };
        const contained = withButton(remover, 'Contained');
        const onClick = vi.fn();
        contained.addEventListener('click', onClick);
        try {
          render(alert(true));
          await focused(button('Confirm'));
          document.body.append(remover);
          await settle();

          expect(remover.received).toBe(2);
          expect(remover.hasAttribute('inert')).toBe(true);
          expect(popup()).not.toBeNull();
          expect(usable(contained)).toBe(false);
          await mouse('down', contained);
          await mouse('up', contained);
          expect(onClick).not.toHaveBeenCalled();
          if (isChromium) {
            expect(await chromiumAXNode('button', 'Contained')).toBeUndefined();
          }

          render(alert(false));
          await closed();
          expect(remover.hasAttribute('inert')).toBe(false);
        } finally {
          remover.remove();
        }
      });

      const pageStyles = {
        // Shows the popup, the backdrop and their layer, whatever their state.
        forcing:
          '[data-floating-ui-portal], .backdrop, .popup { display: block !important; }',
        // Keeps the layer shown while `display` transitions to `none`.
        transitioning:
          '[data-floating-ui-portal] { transition-property: display; transition-duration: 1s; transition-behavior: allow-discrete; }',
      };

      it.each([
        [false, 'forcing'],
        [true, 'forcing'],
        [false, 'transitioning'],
        [true, 'transitioning'],
      ] as const)(
        'withdraws an open dialog before the page is usable again, with a backdrop: %s, with styles %s',
        async (withBackdrop, styles) => {
          // Calls `onRelease` when the dialog makes it usable again.
          class ReleaseProbe extends HTMLElement {
            static observedAttributes = ['inert'];
            onRelease?: () => void;
            attributeChangedCallback() {
              if (!this.inert) this.onRelease?.();
            }
          }
          if (!customElements.get('inert-release-probe')) {
            customElements.define('inert-release-probe', ReleaseProbe);
          }
          const forced = document.head.appendChild(
            document.createElement('style'),
          );
          forced.textContent = pageStyles[styles];
          const probe = document.createElement(
            'inert-release-probe',
          ) as ReleaseProbe;
          document.body.prepend(probe);
          const refuser = createReacting();
          refuser.react = (element) => {
            element.inert = false;
          };
          const contained = withButton(refuser, 'Contained');
          const app = (open: boolean) => {
            const confirm = (
              <Dialog.Popup
                className="popup"
                role="alertdialog"
                aria-label="Confirm"
              >
                <button>Confirm</button>
              </Dialog.Popup>
            );
            return (
              <>
                <button>Outside</button>
                <Dialog.Root open={open}>
                  {withBackdrop ? (
                    <Dialog.Backdrop
                      className="backdrop"
                      data-testid="backdrop"
                    >
                      {confirm}
                    </Dialog.Backdrop>
                  ) : (
                    confirm
                  )}
                </Dialog.Root>
              </>
            );
          };
          try {
            render(app(true));
            await focused(button('Confirm'));
            const shown = popup()!;
            const backdrop = document.querySelector('[data-testid="backdrop"]');
            const layer = shown.closest('[data-floating-ui-portal]')!;
            const area = (element: Element | null) => {
              const box = element?.getBoundingClientRect();
              return (box?.width ?? 0) * (box?.height ?? 0);
            };
            expect(shown.checkVisibility()).toBe(true);
            const atRelease: unknown[] = [];
            probe.onRelease = () => {
              probe.onRelease = undefined;
              atRelease.push({
                committed: !shown.isConnected,
                popup: shown.checkVisibility(),
                backdrop: backdrop?.checkVisibility() ?? false,
                layerDisplay: getComputedStyle(layer).display,
                area: area(shown) + area(backdrop),
                focusInPopup: shown.contains(document.activeElement),
              });
            };
            const atClick: boolean[] = [];
            contained.addEventListener('click', () =>
              atClick.push(shown.isConnected && shown.checkVisibility()),
            );

            document.body.append(refuser);
            await mouse('down', contained);
            await mouse('up', contained);
            await vi.waitFor(() => expect(popup()).toBeNull());

            expect(atRelease).toEqual([
              {
                committed: false,
                popup: false,
                backdrop: false,
                layerDisplay: 'none',
                area: 0,
                focusInPopup: false,
              },
            ]);
            expect(atClick).toEqual([false]);
            expect(refuser.received).toBe(2);
            expect(
              document.querySelector('[data-testid="backdrop"]'),
            ).toBeNull();
            expect(
              document.querySelector('[data-floating-ui-portal]'),
            ).toBeNull();
            expect(
              document.activeElement?.closest('[inert]') ?? null,
            ).toBeNull();
            expect(document.querySelectorAll('[inert]')).toHaveLength(0);
            expect(usable(contained)).toBe(true);
            expect(usable(button('Outside'))).toBe(true);
            expect(html.style.overflow).toBe('');
            if (isChromium) {
              expect(
                await chromiumAXNode('alertdialog', 'Confirm'),
              ).toBeUndefined();
            }
            const later = document.body.appendChild(
              document.createElement('button'),
            );
            await settle();
            expect(usable(later)).toBe(true);
            later.remove();

            refuser.remove();
            render(app(false));
            await settle();
            render(app(true));
            await focused(button('Confirm'));
            expect(popup()!.checkVisibility()).toBe(true);
            expect(usable(button('Outside'))).toBe(false);
            if (isDevelopment) {
              expect(
                errors().filter((error) =>
                  error.startsWith('Dialog: <inert-reacting> removed'),
                ),
              ).toHaveLength(1);
            }
          } finally {
            forced.remove();
            probe.remove();
            refuser.remove();
          }
        },
      );

      it('keeps the dialog below registered when the failed dialog unmounts on withdrawal', async () => {
        const otherContainer = document.body.appendChild(
          document.createElement('div'),
        );
        const other = createRoot(otherContainer);
        const refuser = createReacting();
        refuser.react = (element) => {
          element.inert = false;
        };
        try {
          render(
            <>
              <button>Outside</button>
              <Profile defaultOpen />
            </>,
          );
          await focused(name());
          const profile = name().closest<HTMLElement>('[aria-modal="true"]')!;
          flushSync(() =>
            other.render(
              <Dialog.Root open>
                <Dialog.Popup aria-label="Session expiring">
                  <button onBlur={() => flushSync(() => other.unmount())}>
                    Stay signed in
                  </button>
                </Dialog.Popup>
              </Dialog.Root>,
            ),
          );
          await focused(button('Stay signed in'));
          expect(usable(name())).toBe(false);
          const sessionLayer = button('Stay signed in').closest(
            '[data-floating-ui-portal]',
          )!;

          sessionLayer.append(refuser);
          await vi.waitFor(() =>
            expect(
              document.querySelector('[aria-label="Session expiring"]'),
            ).toBeNull(),
          );
          await settle();

          expect(refuser.received).toBe(2);
          expect(sessionLayer.isConnected).toBe(false);
          expect(otherContainer.childElementCount).toBe(0);
          expect(profile.checkVisibility()).toBe(true);
          expect(
            profile.closest('[data-floating-ui-portal]')!.hasAttribute('style'),
          ).toBe(false);
          expect(usable(name())).toBe(true);
          expect(usable(button('Outside'))).toBe(false);
          expect(
            [...document.querySelectorAll('[inert]')].some(
              (element) =>
                element.contains(profile) || profile.contains(element),
            ),
          ).toBe(false);
          await focusInside(profile);
          if (isChromium) {
            expect(await chromiumAXNode('dialog', 'Profile')).toBeDefined();
            expect(
              await chromiumAXNode('dialog', 'Session expiring'),
            ).toBeUndefined();
          }
          if (isDevelopment) {
            expect(errors()).toEqual([
              'Dialog: <inert-reacting> removed the `inert` the dialog set on it, so the page behind the dialog cannot be made inert. The dialog is not shown.',
            ]);
          }

          await userEvent.keyboard('{Escape}');
          await closed();
          expect(document.querySelectorAll('[inert]')).toHaveLength(0);
          expect(
            document.querySelector('[data-floating-ui-portal]'),
          ).toBeNull();
          const later = document.body.appendChild(
            document.createElement('button'),
          );
          await settle();
          expect(usable(later)).toBe(true);
          later.remove();
        } finally {
          other.unmount();
          otherContainer.remove();
          refuser.remove();
        }
      });

      it('withdraws only the nested dialog that cannot be isolated', async () => {
        render(<Page open nested />);
        await focused(button('Nested action'));
        const parent = popups().find(
          (candidate) => candidate.getAttribute('aria-label') === 'Isolation',
        )!;
        const nestedLayer = button('Nested action').closest(
          '[data-floating-ui-portal]',
        )!;
        expect(
          parent.closest('[data-floating-ui-portal]')!.contains(nestedLayer),
        ).toBe(true);
        const refuser = createReacting();
        refuser.react = (element) => {
          element.inert = false;
        };
        try {
          nestedLayer.append(refuser);
          await vi.waitFor(() =>
            expect(document.querySelector('[aria-label="Nested"]')).toBeNull(),
          );

          expect(refuser.received).toBe(2);
          expect(refuser.isConnected).toBe(false);
          expect(parent.isConnected && parent.checkVisibility()).toBe(true);
          expect(usable(button('First'))).toBe(true);
          expect(usable(button('Outside'))).toBe(false);
          if (isChromium) {
            expect(await chromiumAXNode('dialog', 'Isolation')).toBeDefined();
            expect(await chromiumAXNode('dialog', 'Nested')).toBeUndefined();
          }

          render(<Page open />);
          await settle();
          render(<Page open nested />);
          await focused(button('Nested action'));
          expect(usable(button('First'))).toBe(false);
          expect(usable(button('Outside'))).toBe(false);
        } finally {
          refuser.remove();
        }
      });

      it('hides the dialog and leaves the page usable when the script keeps removing it', async () => {
        const refuser = createReacting();
        refuser.react = (element) => {
          element.inert = false;
        };
        const contained = withButton(refuser, 'Contained');
        const refused = () =>
          errors().filter((error) =>
            error.startsWith('Dialog: <inert-reacting> removed'),
          );
        try {
          render(
            <>
              <button>Outside</button>
              {alert(true)}
            </>,
          );
          await focused(button('Confirm'));
          document.body.append(refuser);
          await vi.waitFor(() => expect(popup()).toBeNull());

          expect(refuser.received).toBe(2);
          expect(document.querySelectorAll('[inert]')).toHaveLength(0);
          expect(usable(contained)).toBe(true);
          expect(usable(button('Outside'))).toBe(true);
          expect(html.style.overflow).toBe('');

          render(alert(false));
          await settle();
          render(alert(true));
          await settle();
          expect(popup()).toBeNull();
          expect(refuser.received).toBe(4);
          expect(document.querySelectorAll('[inert]')).toHaveLength(0);
          if (isDevelopment) {
            expect(refused()).toEqual(
              Array(2).fill(
                'Dialog: <inert-reacting> removed the `inert` the dialog set on it, so the page behind the dialog cannot be made inert. The dialog is not shown.',
              ),
            );
          }
        } finally {
          refuser.remove();
        }
      });
    });

    describe('independent React roots', () => {
      let otherContainer: HTMLDivElement;
      let other: Root;

      beforeEach(() => {
        otherContainer = document.body.appendChild(
          document.createElement('div'),
        );
        other = createRoot(otherContainer);
      });

      afterEach(() => {
        other.unmount();
        otherContainer.remove();
      });

      const session = (open: boolean, onOpenChange?: OnOpenChange) => (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
          <Dialog.Backdrop className="backdrop">
            <Dialog.Popup className="popup" aria-label="Session expiring">
              <button>Stay signed in</button>
            </Dialog.Popup>
          </Dialog.Backdrop>
        </Dialog.Root>
      );
      const sessionPopup = () =>
        document.querySelector<HTMLElement>('[aria-label="Session expiring"]');

      it('keeps the dialog opened last usable, and the one below inert until it closes', async () => {
        const below: OnOpenChange = vi.fn();
        const above: OnOpenChange = vi.fn();
        render(<Profile defaultOpen onOpenChange={below} />);
        await focused(name());

        flushSync(() => other.render(session(true, above)));
        await focused(button('Stay signed in'));
        expect(usable(button('Stay signed in'))).toBe(true);
        expect(usable(name())).toBe(false);
        if (isChromium) {
          expect(await chromiumAXNode('dialog', 'Profile')).toBeUndefined();
          expect(
            await chromiumAXNode('dialog', 'Session expiring'),
          ).toBeDefined();
        }

        // Escape and outside presses reach only the dialog above.
        await userEvent.keyboard('{Escape}');
        await pressBackdrop(sessionPopup()!);
        expect(document.activeElement).toBe(button('Stay signed in'));
        expect(changes(above)).toEqual([
          request(false, 'escape-key'),
          request(false, 'outside-press'),
        ]);
        expect(below).not.toHaveBeenCalled();

        flushSync(() => other.render(session(false, above)));
        await vi.waitFor(() => expect(sessionPopup()).toBeNull());
        await focused(name());
        expect(usable(name())).toBe(true);
        await userEvent.keyboard('{Escape}');
        await closed();
        expect(changes(below)).toEqual([request(false, 'escape-key')]);
        expect(document.querySelectorAll('[inert]')).toHaveLength(0);
      });

      it('stays usable when the dialog below it closes first', async () => {
        render(<Profile open />);
        await focused(name());
        flushSync(() => other.render(session(true)));
        await focused(button('Stay signed in'));

        render(<Profile open={false} />);
        await vi.waitFor(() =>
          expect(document.querySelector('[aria-label="Name"]')).toBeNull(),
        );
        expect(document.activeElement).toBe(button('Stay signed in'));
        expect(usable(button('Stay signed in'))).toBe(true);
        expect(usable(trigger())).toBe(false);

        flushSync(() => other.render(session(false)));
        await closed();
        expect(document.querySelectorAll('[inert]')).toHaveLength(0);
        expect(html.style.overflow).toBe('');
      });

      it('keeps its place below the dialog opened later when its element is replaced', async () => {
        const below: OnOpenChange = vi.fn();
        const above: OnOpenChange = vi.fn();
        const profile = (element?: ReactElement) => (
          <Dialog.Root defaultOpen onOpenChange={below}>
            <Dialog.Popup aria-label="Profile" render={element}>
              <input aria-label="Name" />
            </Dialog.Popup>
          </Dialog.Root>
        );
        const profilePopup = () =>
          document.querySelector<HTMLElement>('[aria-label="Profile"]');
        render(profile());
        await focused(name());
        flushSync(() => other.render(session(true, above)));
        await focused(button('Stay signed in'));

        for (const element of [<section />, <div key="replaced" />]) {
          const previous = profilePopup();
          render(profile(element));
          await settle();
          expect(profilePopup()).not.toBe(previous);
          expect(usable(button('Stay signed in'))).toBe(true);
          expect(usable(name())).toBe(false);
        }
        button('Stay signed in').focus();
        await userEvent.keyboard('{Escape}');
        expect(changes(above)).toEqual([request(false, 'escape-key')]);
        expect(below).not.toHaveBeenCalled();

        flushSync(() => other.render(session(false)));
        await vi.waitFor(() => expect(sessionPopup()).toBeNull());
        expect(usable(name())).toBe(true);
        name().focus();
        await userEvent.keyboard('{Escape}');
        await closed();
        expect(changes(below)).toEqual([request(false, 'escape-key')]);
        expect(document.querySelectorAll('[inert]')).toHaveLength(0);
      });
    });

    describe('third-party layers', () => {
      function Menu({ into }: { into?: () => Element | null }) {
        const [open, setOpen] = useState(false);
        const menu = (
          <ul role="menu" data-testid="menu">
            <li role="menuitem" tabIndex={-1}>
              Rename
            </li>
          </ul>
        );
        return (
          <>
            <button onClick={() => setOpen(true)}>Actions</button>
            {open && createPortal(menu, into?.() ?? document.body)}
          </>
        );
      }
      const menuItem = () =>
        document.querySelector<HTMLElement>('[role="menuitem"]')!;

      it('makes a layer portaled to the body inert', async () => {
        render(<Page open children={<Menu />} />);
        await userEvent.click(button('Actions'));
        await settle();
        expect(menuItem().closest('[inert]')).not.toBeNull();
        expect(usable(menuItem())).toBe(false);
        if (isDevelopment)
          expect(warnings()).toContain(
            'Dialog: made <ul> inert because it was added outside the open dialog. Render it inside the popup (a portal container), or mark its top-level container with `data-pandorah-modal-exempt` to keep it usable.',
          );
      });

      it('keeps a layer usable when it portals into the popup or an exempt container', async () => {
        render(<Page open children={<Menu into={popup} />} />);
        await userEvent.click(button('Actions'));
        await settle();
        expect(usable(menuItem())).toBe(true);
        if (isChromium) {
          expect(await chromiumAXNode('menuitem', 'Rename')).toBeDefined();
        }

        const layers = exempt('');
        try {
          render(<Page open={false} />);
          await closed();
          render(<Page open children={<Menu into={() => layers} />} />);
          await userEvent.click(button('Actions'));
          await settle();
          expect(usable(menuItem())).toBe(true);
        } finally {
          render(<></>);
          layers.remove();
        }
      });
    });
  });

  describe('layering', () => {
    it('keeps a Floating UI popover inside the dialog in its layer, closing it first', async () => {
      const onOpenChange: OnOpenChange = vi.fn();
      render(
        <>
          <button>Outside</button>
          <Profile
            onOpenChange={onOpenChange}
            content={<Popover label="Formatting" />}
          />
        </>,
      );
      await userEvent.click(trigger());
      await userEvent.click(button('Formatting'));
      const element = popover()!;
      // A second copy of @floating-ui/react would portal it to the body,
      // where it is inert.
      expect(
        popup()!.closest('[data-floating-ui-portal]')!.contains(element),
      ).toBe(true);
      expect(usable(button('Item'))).toBe(true);
      if (isChromium) {
        expect(await chromiumAXNode('button', 'Item')).toBeDefined();
      }
      let clicks = 0;
      button('Item').addEventListener('click', () => clicks++);
      await userEvent.click(button('Item'));
      expect(clicks).toBe(1);

      button('Item').focus();
      await userEvent.keyboard('{Escape}');
      await vi.waitFor(() => expect(popover()).toBeNull());
      expect(popup()).not.toBeNull();
      await userEvent.keyboard('{Escape}');
      await closed();

      // A press outside both closes both.
      await userEvent.click(trigger());
      await userEvent.click(button('Formatting'));
      await pressBackdrop();
      await closed();
      expect(popover()).toBeNull();
      expect(changes(onOpenChange)).toEqual([
        request(true, 'trigger-press'),
        request(false, 'escape-key'),
        request(true, 'trigger-press'),
        request(false, 'outside-press'),
      ]);
      expect(errors()).toEqual([]);
    });

    it('opens above the popover it opened from, and closes one layer at a time', async () => {
      render(
        <FloatingTree>
          <Popover label="More">
            <button>Item</button>
            <Profile />
          </Popover>
        </FloatingTree>,
      );
      await userEvent.click(button('More'));
      await userEvent.click(trigger());
      await focused(name());
      expect(usable(button('Item'))).toBe(false);

      await userEvent.keyboard('{Escape}');
      await closed();
      expect(popover()).not.toBeNull();
      // The pressed trigger, even in WebKit, which does not focus it.
      await focused(trigger());

      await userEvent.click(trigger());
      await focused(name());
      await pressBackdrop();
      await closed();
      expect(popover()).not.toBeNull();

      await userEvent.keyboard('{Escape}');
      await vi.waitFor(() => expect(popover()).toBeNull());
      await focused(button('More'));
    });

    it('leaves Escape to a native popover inside the dialog first', async () => {
      function NativePopover() {
        const id = useId();
        return (
          <>
            <button popoverTarget={id}>Help</button>
            <div popover="auto" id={id}>
              <button>Tip</button>
            </div>
          </>
        );
      }
      render(<Profile content={<NativePopover />} />);
      await userEvent.click(trigger());
      await userEvent.click(button('Help'));
      const native = document.querySelector('[popover]')!;
      expect(native.matches(':popover-open')).toBe(true);

      await userEvent.keyboard('{Escape}');
      expect(native.matches(':popover-open')).toBe(false);
      expect(popup()).not.toBeNull();
      await userEvent.keyboard('{Escape}');
      await closed();
    });

    it('makes native top-layer content opened before it inert while it is open', async () => {
      const host = document.body.appendChild(document.createElement('div'));
      host.setAttribute('popover', 'manual');
      host.innerHTML = '<button>Notification</button>';
      try {
        host.showPopover();
        render(<Profile />);
        await userEvent.click(trigger());
        await focused(name());
        // It still paints above the dialog: the top layer is the browser's.
        expect(host.matches(':popover-open')).toBe(true);
        expect(usable(button('Notification'))).toBe(false);
        if (isChromium) {
          expect(
            await chromiumAXNode('button', 'Notification'),
          ).toBeUndefined();
        }
        await userEvent.keyboard('{Escape}');
        await closed();
        expect(usable(button('Notification'))).toBe(true);
      } finally {
        host.remove();
      }
    });

    it('leaves Escape to a native modal dialog opened above it, which stays inert', async () => {
      render(<Profile defaultOpen />);
      await focused(name());
      const native = document.body.appendChild(
        document.createElement('dialog'),
      );
      native.innerHTML = '<button>A</button>';
      try {
        native.showModal();
        await settle();
        // Added outside the open dialog, so the strict policy makes it inert.
        expect(native.hasAttribute('inert')).toBe(true);
        expect(usable(button('A'))).toBe(false);

        await userEvent.keyboard('{Escape}');
        expect(native.open).toBe(false);
        expect(popup()).not.toBeNull();
      } finally {
        native.remove();
      }
      name().focus();
      await userEvent.keyboard('{Escape}');
      await closed();
    });
  });

  it('requires Dialog.Root', () => {
    const onUncaughtError = vi.fn();
    const host = document.body.appendChild(document.createElement('div'));
    const errorRoot = createRoot(host, { onUncaughtError });
    flushSync(() => errorRoot.render(<Dialog.Close>Cancel</Dialog.Close>));
    expect((onUncaughtError.mock.calls[0]?.[0] as Error).message).toBe(
      'Dialog.Close must be rendered inside Dialog.Root.',
    );
    errorRoot.unmount();
    host.remove();
  });
});
