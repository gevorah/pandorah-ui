/// <reference types="@vitest/browser-playwright" />
import { Button, type ButtonProps } from '@pandorah-ui/react';
import {
  createRef,
  Fragment,
  StrictMode,
  type ComponentPropsWithRef,
  type ReactElement,
} from 'react';
import { createPortal, flushSync } from 'react-dom';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import { cdp, userEvent } from 'vitest/browser';

let container: HTMLDivElement;
let root: Root;
let consoleError: MockInstance<typeof console.error>;

function render(element: ReactElement) {
  flushSync(() => root.render(element));
}

function errors() {
  return consoleError.mock.calls.map((call) => String(call[0]));
}

// Rendering errors are reported to the root instead of thrown.
function renderError(element: ReactElement) {
  const onUncaughtError = vi.fn();
  const host = document.body.appendChild(document.createElement('div'));
  const errorRoot = createRoot(host, { onUncaughtError });
  flushSync(() => errorRoot.render(element));
  errorRoot.unmount();
  host.remove();
  return (onUncaughtError.mock.calls[0]?.[0] as Error | undefined)?.message;
}

beforeEach(() => {
  container = document.body.appendChild(document.createElement('div'));
  root = createRoot(container);
  consoleError = vi.spyOn(console, 'error');
});

afterEach(() => {
  root.unmount();
  container.remove();
  consoleError.mockRestore();
});

describe('Button', () => {
  it('passes the ref prop and DOM props to the native button', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Button ref={ref} data-testid="save" aria-label="Save draft">
        Save
      </Button>,
    );
    // @ts-expect-error Button only accepts a ref to an HTMLButtonElement
    void (<Button ref={createRef<HTMLDivElement>()}>Save</Button>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.dataset.testid).toBe('save');
    expect(ref.current?.getAttribute('aria-label')).toBe('Save draft');
    expect(ref.current?.type).toBe('button');
    expect(errors()).toEqual([]);
  });

  it('renders a bare native button without Pandorah styles', () => {
    render(<Button>Save</Button>);
    const button = container.querySelector('button')!;

    expect([...button.attributes].map((attribute) => attribute.name)).toEqual([
      'type',
    ]);
    const rules = [...document.styleSheets].flatMap((sheet) => [
      ...sheet.cssRules,
    ]);
    // Vitest's page only resets the margins of `html` and `body`.
    expect(
      rules.filter(
        (rule) =>
          !(rule instanceof CSSStyleRule) ||
          !['html', 'body'].includes(rule.selectorText),
      ),
    ).toEqual([]);
    expect(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--color-background-accent',
      ),
    ).toBe('');
  });

  it('keeps native disabled and type behavior', async () => {
    const onClick = vi.fn();
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    render(
      <form onSubmit={(event) => onSubmit(event.nativeEvent)}>
        <Button disabled onClick={onClick}>
          Disabled
        </Button>
        <Button type="submit">Send</Button>
      </form>,
    );
    const [disabled, submit] = container.querySelectorAll('button');

    expect(disabled.disabled).toBe(true);
    expect(disabled.matches(':disabled')).toBe(true);
    disabled.click();
    expect(onClick).not.toHaveBeenCalled();
    await userEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(errors()).toEqual([]);
  });

  it('merges itself into a render element without adding elements', async () => {
    const order: string[] = [];
    const componentRef = createRef<HTMLButtonElement>();
    const elementRef = createRef<HTMLButtonElement>();
    render(
      <Button
        ref={componentRef}
        id="component"
        className="component"
        style={{ color: 'red', margin: 0 }}
        onClick={() => order.push('component')}
        render={
          <button
            ref={elementRef}
            id="element"
            className="element"
            style={{ color: 'blue' }}
            onClick={() => order.push('element')}
          />
        }
      >
        Save
      </Button>,
    );
    const button = container.querySelector('button')!;

    expect(container.children).toHaveLength(1);
    expect(componentRef.current).toBe(button);
    expect(elementRef.current).toBe(button);
    expect(button.id).toBe('element');
    expect(button.className).toBe('component element');
    expect(button.style.color).toBe('blue');
    expect(button.style.margin).toBe('0px');
    await userEvent.click(button);
    expect(order).toEqual(['element', 'component']);
    expect(errors()).toEqual([]);
  });

  it('passes every handler argument and keeps defined styles', () => {
    type PickerProps = ComponentPropsWithRef<'button'> & {
      onPick?: (value: string, reason: string) => void;
    };
    function Picker({ onPick, ...props }: PickerProps) {
      return <button {...props} onClick={() => onPick?.('apple', 'click')} />;
    }
    const calls: string[][] = [];
    const componentProps = {
      onPick: (...args: string[]) => calls.push(['component', ...args]),
      style: { color: 'red' },
    };
    render(
      <Button
        {...componentProps}
        render={
          <Picker
            onPick={(...args) => calls.push(['element', ...args])}
            style={{ color: undefined, margin: 0 }}
          />
        }
      >
        Pick
      </Button>,
    );
    const button = container.querySelector('button')!;

    button.click();
    expect(calls).toEqual([
      ['element', 'apple', 'click'],
      ['component', 'apple', 'click'],
    ]);
    expect(button.style.color).toBe('red');
    expect(button.style.margin).toBe('0px');
    expect(errors()).toEqual([]);
  });

  it('keeps its own type, and any layer can disable it', async () => {
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    render(
      <form onSubmit={(event) => onSubmit(event.nativeEvent)}>
        <Button disabled render={<button disabled={false} type="submit" />}>
          Save
        </Button>
        <Button render={<button disabled />}>Send</Button>
        <Button disabled={false} render={<button disabled />}>
          Archive
        </Button>
        <Button render={<button type="submit" />}>Submit</Button>
      </form>,
    );
    const [save, send, archive, submit] = container.querySelectorAll('button');

    expect(save.disabled).toBe(true);
    expect(save.type).toBe('button');
    expect(send.disabled).toBe(true);
    expect(archive.disabled).toBe(true);
    await userEvent.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(errors()).toEqual([
      'Button: `type` is decided by the component and cannot be overridden.',
      'Button: `disabled` is decided by the component and cannot be overridden.',
      'Button: `type` is decided by the component and cannot be overridden.',
    ]);
  });

  it('decides aria-disabled and data-pending, including their absence', () => {
    const app = (state: { disabled?: boolean; pending?: boolean }) => (
      <>
        <Button
          {...state}
          render={<button aria-disabled="false" data-pending="" />}
        >
          Element
        </Button>
        <Button {...state} aria-disabled="true" data-pending="">
          Props
        </Button>
      </>
    );

    for (const [state, expected] of [
      [{}, [null, null]],
      [{ pending: true }, ['true', 'true']],
      [{ disabled: true }, [null, null]],
      [{ disabled: true, pending: true }, [null, 'true']],
      [{}, [null, null]],
    ] as const) {
      render(app(state));
      for (const button of container.querySelectorAll('button')) {
        expect([
          button.getAttribute('aria-disabled'),
          button.getAttribute('data-pending'),
        ]).toEqual(expected);
      }
    }
    expect(new Set(errors())).toEqual(
      new Set([
        'Button: `aria-disabled` is decided by the component and cannot be overridden.',
        'Button: `data-pending` is decided by the component and cannot be overridden.',
      ]),
    );
  });

  it('rejects render elements that are not buttons before rendering', () => {
    expect(renderError(<Button render={<a href="/" />} />)).toBe(
      'Button: `render` must be <button>, but received <a>.',
    );
    expect(renderError(<Button render={<Fragment />} />)).toBe(
      'Button: `render` must be a single element that renders <button>.',
    );
  });

  it('checks what a render component mounts, including boolean and absent attributes', () => {
    function Box(props: ComponentPropsWithRef<'div'>) {
      return <div {...props} />;
    }
    function DropsDisabled(props: ComponentPropsWithRef<'button'>) {
      return <button {...props} disabled={undefined} />;
    }
    function AddsAriaDisabled(props: ComponentPropsWithRef<'button'>) {
      return <button {...props} aria-disabled="false" />;
    }
    render(
      <>
        <Button render={<Box />}>Box</Button>
        <Button disabled render={<DropsDisabled />}>
          Drops disabled
        </Button>
        <Button render={<DropsDisabled />}>Enabled</Button>
        <Button disabled render={<AddsAriaDisabled />}>
          Adds aria-disabled
        </Button>
      </>,
    );

    expect(errors()).toEqual([
      'Button: rendered <div>, but it must render <button>.',
      'Button: the render element did not pass `disabled` to its DOM element.',
      'Button: the render element added `aria-disabled`, which the component leaves out.',
    ]);
  });

  it('checks what mounts in another document, such as an iframe', () => {
    function NoRef({ children }: ComponentPropsWithRef<'button'>) {
      return <button type="button">{children}</button>;
    }
    const frame = document.body.appendChild(document.createElement('iframe'));
    render(
      createPortal(
        <>
          <Button>Own</Button>
          <Button render={<button />}>Element</Button>
          <Button render={(props) => <button {...props} />}>Function</Button>
          <Button render={<NoRef />}>No ref</Button>
        </>,
        frame.contentDocument!.body,
      ),
    );

    expect(frame.contentDocument!.querySelectorAll('button')).toHaveLength(4);
    expect(errors()).toEqual([
      expect.stringContaining(
        'Button: the render element did not attach the ref.',
      ),
    ]);
    render(<></>);
    frame.remove();
  });

  it('renders the element a render function returns with the prepared props', async () => {
    const onClick = vi.fn();
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    const ref = createRef<HTMLButtonElement>();
    const app = (pending: boolean) => (
      <form onSubmit={(event) => onSubmit(event.nativeEvent)}>
        <Button
          ref={ref}
          type="submit"
          pending={pending}
          className="component"
          style={{ color: 'red' }}
          onClick={onClick}
          render={(props) => (
            <button {...props} className={`${props.className} element`}>
              <span aria-hidden>+</span>
              {props.children}
            </button>
          )}
        >
          Save
        </Button>
      </form>
    );

    render(app(false));
    const button = container.querySelector('button')!;
    expect(ref.current).toBe(button);
    expect(button.className).toBe('component element');
    expect(button.style.color).toBe('red');
    expect(button.textContent).toBe('+Save');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    render(app(true));
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.hasAttribute('data-pending')).toBe(true);
    await userEvent.click(button, { force: true });
    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(errors()).toEqual([]);
  });

  it('leaves what a render function overrides to it and reports decided attributes it changes', () => {
    const save = vi.fn();
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    render(
      <form onSubmit={(event) => onSubmit(event.nativeEvent)}>
        <Button
          pending
          type="submit"
          render={(props) => <button {...props} onClick={save} />}
        >
          Save
        </Button>
        <Button render={(props) => <button {...props} type="submit" />}>
          Submit
        </Button>
        <Button render={(props) => <button {...props} ref={undefined} />}>
          Without ref
        </Button>
      </form>,
    );

    // The callback's own handler replaces the one that withholds activation.
    container.querySelector('button')!.click();
    expect(save).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(errors()).toEqual([
      'Button: the render element did not pass `type` to its DOM element.',
      expect.stringContaining(
        'Button: the render element did not attach the ref.',
      ),
    ]);
  });

  it('rejects a render function that returns anything but a button', () => {
    // @ts-expect-error A render function returns an element.
    const returnsChildren = <Button render={(props) => props.children} />;

    expect(renderError(<Button render={() => <a href="/" />} />)).toBe(
      'Button: `render` must return <button>, but returned <a>.',
    );
    for (const app of [
      <Button render={() => <Fragment />} />,
      returnsChildren,
    ]) {
      expect(renderError(app)).toBe(
        'Button: `render` must return a single element that renders <button>.',
      );
    }
  });

  it('attaches merged refs once and cleans them up in Strict Mode', () => {
    const events: string[] = [];
    const callbackRef = (node: HTMLButtonElement | null) => {
      events.push(`attach:${node?.localName}`);
      return () => {
        events.push('cleanup');
      };
    };
    const objectRef = createRef<HTMLButtonElement>();
    const app = (label: string) => (
      <StrictMode>
        <Button ref={callbackRef} render={<button ref={objectRef} />}>
          {label}
        </Button>
      </StrictMode>
    );

    render(app('Save'));
    render(app('Saved'));
    expect(objectRef.current?.textContent).toBe('Saved');
    root.unmount();

    expect(events).toEqual([
      'attach:button',
      'cleanup',
      'attach:button',
      'cleanup',
    ]);
    expect(objectRef.current).toBeNull();
    root = createRoot(container);
  });

  it('keeps its hooks, ref and decisions when the render mode changes', () => {
    const ref = createRef<HTMLButtonElement>();
    const modes: ButtonProps['render'][] = [
      undefined,
      <button />,
      (props) => <button {...props} />,
      undefined,
    ];

    for (const mode of modes) {
      render(
        <StrictMode>
          <Button ref={ref} pending render={mode}>
            Save
          </Button>
        </StrictMode>,
      );
      expect(ref.current).toBe(container.querySelector('button'));
      expect(ref.current?.getAttribute('aria-disabled')).toBe('true');
    }
    root.unmount();
    expect(ref.current).toBeNull();
    expect(errors()).toEqual([]);
    root = createRoot(container);
  });
});

async function accessibilityState(name: string) {
  type Node = {
    ignored: boolean;
    role?: { value: string };
    name?: { value: string };
    properties?: { name: string; value: { value: unknown } }[];
  };
  type FrameTree = { frame: { id: string }; childFrames?: FrameTree[] };
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
    })) as { nodes: Node[] };
    const node = nodes.find(
      (candidate) =>
        !candidate.ignored &&
        candidate.role?.value === 'button' &&
        candidate.name?.value === name,
    );
    if (node) {
      return Object.fromEntries(
        (node.properties ?? [])
          .filter(({ name }) => name === 'disabled' || name === 'focusable')
          .map(({ name, value }) => [name, value.value]),
      );
    }
  }
  return undefined;
}

describe('Button pending', () => {
  it('stays focusable and announced as unavailable, without activating', async () => {
    const handlers = {
      onClick: vi.fn(),
      onDoubleClick: vi.fn(),
      onPointerDown: vi.fn(),
      onPointerUp: vi.fn(),
      onMouseDown: vi.fn(),
      onMouseUp: vi.fn(),
      onKeyDown: vi.fn(),
      onKeyUp: vi.fn(),
      onFocus: vi.fn(),
      onPointerEnter: vi.fn(),
    };
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    render(
      <form onSubmit={(event) => onSubmit(event.nativeEvent)}>
        <input aria-label="Query" />
        <Button type="submit" pending {...handlers}>
          Save
        </Button>
      </form>,
    );
    const button = container.querySelector('button')!;
    const keys = (handler: typeof handlers.onKeyDown) =>
      handler.mock.calls.map(([event]) => event.key);

    expect(button.disabled).toBe(false);
    expect(button.type).toBe('submit');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.hasAttribute('data-pending')).toBe(true);
    expect(await accessibilityState('Save')).toEqual({
      disabled: true,
      focusable: true,
    });

    await userEvent.dblClick(button, { force: true });
    expect(document.activeElement).toBe(button);
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    await userEvent.keyboard('a{Escape}{ArrowDown}');
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    expect(document.activeElement).toBe(container.querySelector('input'));
    await userEvent.keyboard('{Enter}');

    for (const handler of [
      handlers.onClick,
      handlers.onDoubleClick,
      handlers.onPointerDown,
      handlers.onPointerUp,
      handlers.onMouseDown,
      handlers.onMouseUp,
    ]) {
      expect(handler).not.toHaveBeenCalled();
    }
    expect(keys(handlers.onKeyDown)).toEqual([
      'a',
      'Escape',
      'ArrowDown',
      'Shift',
      'Tab',
    ]);
    expect(keys(handlers.onKeyUp)).toEqual(['a', 'Escape', 'ArrowDown']);
    expect(handlers.onFocus).toHaveBeenCalled();
    expect(handlers.onPointerEnter).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(errors()).toEqual([]);
  });

  it('lets disabled win and works normally again once settled', async () => {
    const onClick = vi.fn();
    const onPointerDown = vi.fn();
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    const app = (state: { disabled?: boolean; pending?: boolean }) => (
      <form onSubmit={(event) => onSubmit(event.nativeEvent)}>
        <Button
          type="submit"
          onClick={onClick}
          onPointerDown={onPointerDown}
          {...state}
        >
          Save
        </Button>
      </form>
    );
    const button = () => container.querySelector('button')!;
    const attributes = () => ({
      disabled: button().disabled,
      ariaDisabled: button().getAttribute('aria-disabled'),
      pending: button().hasAttribute('data-pending'),
    });

    render(app({ disabled: true, pending: true }));
    expect(attributes()).toEqual({
      disabled: true,
      ariaDisabled: null,
      pending: true,
    });
    // A natively disabled button still dispatches pointer events.
    await mouse('mousePressed', button());
    await mouse('mouseReleased', button());
    expect(onPointerDown).not.toHaveBeenCalled();
    render(app({ pending: true }));
    expect(attributes()).toEqual({
      disabled: false,
      ariaDisabled: 'true',
      pending: true,
    });
    render(app({}));
    expect(attributes()).toEqual({
      disabled: false,
      ariaDisabled: null,
      pending: false,
    });

    await userEvent.click(button());
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(2);
    expect(onPointerDown).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('applies through components that forward props and reports one that drops aria-disabled', async () => {
    const onClick = vi.fn();
    function Forwards(props: ComponentPropsWithRef<'button'>) {
      return <button {...props} />;
    }
    function DropsAriaDisabled(props: ComponentPropsWithRef<'button'>) {
      return <button {...props} aria-disabled={undefined} />;
    }
    render(
      <>
        <Button pending onClick={onClick} render={<Forwards />}>
          Forwards
        </Button>
        <Button pending render={<DropsAriaDisabled />}>
          Drops
        </Button>
      </>,
    );
    const [forwards] = container.querySelectorAll('button');

    await userEvent.click(forwards, { force: true });
    expect(forwards.getAttribute('aria-disabled')).toBe('true');
    expect(onClick).not.toHaveBeenCalled();
    expect(errors()).toEqual([
      'Button: the render element did not pass `aria-disabled` to its DOM element.',
    ]);
  });

  it('keeps a form from submitting through it, as a disabled default button does', async () => {
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    render(
      <form onSubmit={(event) => onSubmit(event.nativeEvent)}>
        <input aria-label="Query" />
        <Button type="submit" pending>
          Save
        </Button>
        <button type="submit">Other</button>
      </form>,
    );

    container.querySelector('input')!.focus();
    await userEvent.keyboard('{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.click(container.querySelector('button')!, { force: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('cancels virtual clicks and taps, and lets the click propagate canceled', async () => {
    const handlers = {
      onClick: vi.fn(),
      onPointerDown: vi.fn(),
      onTouchStart: vi.fn(),
      onTouchEnd: vi.fn(),
    };
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    const ancestorSawCanceled: boolean[] = [];
    render(
      <div
        onClick={(event) => ancestorSawCanceled.push(event.defaultPrevented)}
      >
        <form onSubmit={(event) => onSubmit(event.nativeEvent)}>
          <Button type="submit" pending {...handlers}>
            Save
          </Button>
        </form>
      </div>,
    );
    const button = container.querySelector('button')!;

    // Screen readers and `element.click()` dispatch a click with no pointer.
    button.click();
    button.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 }),
    );
    await tap(button);

    for (const handler of Object.values(handlers)) {
      expect(handler).not.toHaveBeenCalled();
    }
    expect(onSubmit).not.toHaveBeenCalled();
    expect(ancestorSawCanceled).toEqual([true, true, true]);
  });

  it('decides activation when the click happens', async () => {
    const onClick = vi.fn();
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    const app = (pending: boolean) => (
      <form onSubmit={(event) => onSubmit(event.nativeEvent)}>
        <Button type="submit" pending={pending} onClick={onClick}>
          Save
        </Button>
      </form>
    );
    type Press = [
      (button: Element) => Promise<void>,
      (button: Element) => Promise<void>,
    ];
    const pointerPress: Press = [
      (button) => mouse('mousePressed', button),
      (button) => mouse('mouseReleased', button),
    ];
    const spacePress: Press = [() => space('keyDown'), () => space('keyUp')];
    const pressAcross = async (
      [down, up]: Press,
      from: boolean,
      to: boolean,
    ) => {
      render(app(from));
      const button = container.querySelector('button')!;
      button.focus();
      await down(button);
      render(app(to));
      await up(button);
    };

    for (const press of [pointerPress, spacePress]) {
      onClick.mockClear();
      onSubmit.mockClear();

      await pressAcross(press, false, true);
      expect(onClick).not.toHaveBeenCalled();
      expect(onSubmit).not.toHaveBeenCalled();

      // As with a natively disabled button that gets enabled during a pointer
      // press. Space activates on keyup, so the same rule applies to it.
      await pressAcross(press, true, false);
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledTimes(1);
    }
  });

  it('hydrates as aria-disabled in a single pass and blocks activation once hydrated', async () => {
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    const app = (
      <form>
        <input aria-label="Query" />
        <Button type="submit" pending>
          Save
        </Button>
      </form>
    );
    const server = document.body.appendChild(document.createElement('div'));
    server.innerHTML = renderToString(app);
    const serverHtml = server.innerHTML;
    server.querySelector('form')!.addEventListener('submit', onSubmit);
    const button = server.querySelector('button')!;

    // Before hydration nothing cancels activation; see the README.
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-disabled')).toBe('true');

    const onRecoverableError = vi.fn();
    const hydrated = hydrateRoot(server, app, { onRecoverableError });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(server.innerHTML).toBe(serverHtml);
    await userEvent.click(button, { force: true });
    expect(document.activeElement).toBe(button);
    server.querySelector('input')!.focus();
    await userEvent.keyboard('{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(errors()).toEqual([]);
    hydrated.unmount();
    server.remove();
  });
});

async function mouse(type: 'mousePressed' | 'mouseReleased', element: Element) {
  const { x, y } = element.getBoundingClientRect();
  await cdp().send('Input.dispatchMouseEvent', {
    type,
    x: x + 5,
    y: y + 5,
    button: 'left',
    clickCount: 1,
  });
}

async function space(type: 'keyDown' | 'keyUp') {
  await cdp().send('Input.dispatchKeyEvent', {
    type,
    key: ' ',
    code: 'Space',
    windowsVirtualKeyCode: 32,
    ...(type === 'keyDown' && { text: ' ' }),
  });
}

async function tap(element: Element) {
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
