/// <reference types="@vitest/browser-playwright" />
import { Button } from '@pandorah-ui/react';
import {
  createRef,
  StrictMode,
  useId,
  useState,
  type ComponentPropsWithRef,
  type MouseEvent,
  type ReactElement,
  type Ref,
} from 'react';
import { flushSync } from 'react-dom';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import { cdp, userEvent } from 'vitest/browser';

import { mergeProps } from '../../../packages/react/src/internal/composition/merge-props';
import { mergeRefs } from '../../../packages/react/src/internal/composition/merge-refs';
import { useMergeRefs } from '../../../packages/react/src/internal/composition/use-merge-refs';
import {
  useRender,
  type ComposableProps,
} from '../../../packages/react/src/internal/composition/use-render';

let container: HTMLDivElement;
let root: Root;
let consoleError: MockInstance<typeof console.error>;

function render(element: ReactElement) {
  flushSync(() => root.render(element));
}

function errors() {
  return consoleError.mock.calls.map((call) => String(call[0]));
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

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

describe('mergeProps', () => {
  it('runs both handlers with every argument, override first, and returns nothing', () => {
    const calls: unknown[][] = [];
    const merged = mergeProps(
      { onChange: (...args: unknown[]) => calls.push(['base', ...args]) },
      { onChange: (...args: unknown[]) => calls.push(['override', ...args]) },
    );

    const result = (merged.onChange as (...args: unknown[]) => unknown)('a', 1);
    expect(calls).toEqual([
      ['override', 'a', 1],
      ['base', 'a', 1],
    ]);
    expect(result).toBeUndefined();
  });

  it('joins classes, merges styles and ignores undefined values', () => {
    expect(
      mergeProps(
        { className: 'base', style: { color: 'red', margin: 0 }, title: 'Base' },
        {
          className: 'override',
          style: { color: undefined, padding: 1 },
          title: undefined,
        },
      ),
    ).toEqual({
      className: 'base override',
      style: { color: 'red', margin: 0, padding: 1 },
      title: 'Base',
    });
  });

  it('keeps every aria-describedby id, override first, without duplicates', () => {
    expect(
      mergeProps(
        { 'aria-describedby': 'tooltip hint' },
        { 'aria-describedby': 'hint error' },
      ),
    ).toEqual({ 'aria-describedby': 'hint error tooltip' });
  });

  it('lets override win other values, including null', () => {
    const merged = mergeProps(
      { id: 'base', 'aria-label': 'Base', hidden: true, tabIndex: 0 },
      { id: 'override', 'aria-label': null, hidden: true, tabIndex: -1 },
    );

    expect(merged).toEqual({
      id: 'override',
      'aria-label': null,
      hidden: true,
      tabIndex: -1,
    });
  });

  it('leaves refs out and composes in nested order', () => {
    const order: string[] = [];
    const inner = mergeProps(
      { onClick: () => order.push('inner base'), ref: createRef() },
      { onClick: () => order.push('inner override'), ref: createRef() },
    );
    const outer = mergeProps(inner, {
      onClick: () => order.push('outer override'),
    });

    (outer.onClick as () => void)();
    expect(order).toEqual(['outer override', 'inner override', 'inner base']);
    expect('ref' in outer).toBe(false);
  });
});

describe('mergeProps types', () => {
  it('types the result like the runtime precedence', () => {
    const literal = mergeProps(
      { type: 'button' as const, id: 'base' },
      { type: 'submit' as const },
    );
    expectTypeOf(literal.type).toEqualTypeOf<'submit'>();
    expectTypeOf(literal.id).toEqualTypeOf<string>();
    // @ts-expect-error The override's literal replaces the base's.
    const base: 'button' = literal.type;
    void base;

    const optional = mergeProps(
      { title: 'Base' as const },
      {} as { title?: 'Override'; hidden?: boolean },
    );
    expectTypeOf(optional.title).toEqualTypeOf<'Override' | 'Base'>();
    expectTypeOf(optional.hidden).toEqualTypeOf<boolean | undefined>();

    const withRefs = mergeProps({ ref: createRef<HTMLElement>() }, {});
    expectTypeOf(withRefs).not.toHaveProperty('ref');
  });

  it('types chained handlers as returning nothing, with the arguments both accept', () => {
    const merged = mergeProps(
      { onChange: (value: string) => value.length },
      { onChange: (value: string) => value.length * 2 },
    );
    expect(merged.onChange('ab')).toBeUndefined();
    expectTypeOf(merged.onChange).toEqualTypeOf<(value: string) => void>();

    type ButtonClick = (event: MouseEvent<HTMLButtonElement>) => void;
    const click: ButtonClick = (event) => void event;
    const ignoreEvent = () => {};
    expectTypeOf(
      mergeProps({ onClick: ignoreEvent }, { onClick: click }).onClick,
    ).toEqualTypeOf<ButtonClick>();
    expectTypeOf(
      mergeProps({ onClick: click }, { onClick: ignoreEvent }).onClick,
    ).toEqualTypeOf<ButtonClick>();

    const maybeClick = undefined as ButtonClick | undefined;
    const count = (): number => 1;
    expectTypeOf(
      mergeProps({ onClick: maybeClick }, { onClick: count }).onClick,
    ).toEqualTypeOf<ButtonClick | (() => number)>();
  });

  it('keeps the type of a handler or value that only one side sets', () => {
    const merged = mergeProps(
      { onFocus: (): number => 1, className: 'base' as const },
      {
        onBlur: (event: FocusEvent) => event.type,
        style: { color: 'red' },
        'aria-describedby': 'hint' as const,
      },
    );
    expect(merged.onFocus()).toBe(1);
    expectTypeOf(merged.onFocus).toEqualTypeOf<() => number>();
    expectTypeOf(merged.onBlur).toEqualTypeOf<(event: FocusEvent) => string>();
    expectTypeOf(merged.className).toEqualTypeOf<'base'>();
    expectTypeOf(merged.style).toEqualTypeOf<{ color: string }>();
    expectTypeOf(merged['aria-describedby']).toEqualTypeOf<'hint'>();
  });

  it('types joined classes and descriptions as strings', () => {
    const merged = mergeProps(
      { className: 'base', 'aria-describedby': 'hint' },
      { className: 'extra' as const, 'aria-describedby': 'error' as const },
    );
    expect(merged).toEqual({
      className: 'base extra',
      'aria-describedby': 'error hint',
    });
    expectTypeOf(merged.className).toEqualTypeOf<string>();
    expectTypeOf(merged['aria-describedby']).toEqualTypeOf<string>();

    const overridden = mergeProps(
      { className: undefined as string | undefined },
      { className: null as 'extra' | null },
    );
    expectTypeOf(overridden.className).toEqualTypeOf<string | null>();
  });

  it('types merged styles with the properties of both', () => {
    const merged = mergeProps(
      { style: { color: 'red', margin: 0 } },
      { style: { color: undefined, padding: 1 } },
    );
    expect(merged.style).toEqual({ color: 'red', margin: 0, padding: 1 });
    expectTypeOf(merged.style.color).toEqualTypeOf<string>();
    expectTypeOf(merged.style.margin).toEqualTypeOf<number>();
    expectTypeOf(merged.style.padding).toEqualTypeOf<number>();
  });

  it('keeps the base value where the override can be undefined', () => {
    const merged = mergeProps(
      {
        className: 'base' as const,
        title: 'Base' as const,
        onClick: (): number => 1,
      },
      {} as { className?: string; title: undefined; onClick?: () => void },
    );
    expectTypeOf(merged.className).toEqualTypeOf<string>();
    expectTypeOf(merged.title).toEqualTypeOf<'Base'>();
    expectTypeOf(merged.onClick).toEqualTypeOf<(() => number) | (() => void)>();
  });

  it('lets the override win keys that are not merged', () => {
    const merged = mergeProps(
      {
        onchange: (): number => 1,
        on: (): number => 1,
        render: (): number => 1,
      },
      {
        onchange: (): string => 'a',
        on: (): string => 'a',
        render: (): string => 'a',
      },
    );
    expect(merged.onchange()).toBe('a');
    expectTypeOf(merged.onchange).toEqualTypeOf<() => string>();
    expectTypeOf(merged.on).toEqualTypeOf<() => string>();
    expectTypeOf(merged.render).toEqualTypeOf<() => string>();
  });
});

describe('mergeRefs and useMergeRefs', () => {
  it('runs each ref cleanup, or resets refs without one', () => {
    const element = document.createElement('button');
    const objectRef = createRef<HTMLButtonElement>();
    const legacyRef = vi.fn();
    const cleanup = vi.fn();
    const cleanupRef = vi.fn(() => cleanup);

    const detach = mergeRefs(objectRef, legacyRef, cleanupRef, undefined)(element);
    expect(objectRef.current).toBe(element);
    expect(legacyRef).toHaveBeenLastCalledWith(element);

    (detach as () => void)();
    expect(objectRef.current).toBeNull();
    expect(legacyRef).toHaveBeenLastCalledWith(null);
    expect(cleanup).toHaveBeenCalledOnce();
    expect(cleanupRef).toHaveBeenCalledOnce();
  });

  it('keeps its identity while the refs do, and reattaches when one changes', () => {
    const events: string[] = [];
    const track = (label: string) => (node: HTMLButtonElement | null) => {
      events.push(`${label}:${node ? 'attach' : 'detach'}`);
    };
    const first = track('first');
    const second = track('second');
    const objectRefs = [1, 2, 3].map(() => createRef<HTMLButtonElement>());
    function Target({ callbackRef }: { callbackRef: Ref<HTMLButtonElement> }) {
      const [before, ...after] = objectRefs;
      return <button ref={useMergeRefs(before, callbackRef, ...after)} />;
    }

    render(<StrictMode><Target callbackRef={first} /></StrictMode>);
    render(<StrictMode><Target callbackRef={first} /></StrictMode>);
    expect(events).toEqual(['first:attach', 'first:detach', 'first:attach']);

    events.length = 0;
    render(<StrictMode><Target callbackRef={second} /></StrictMode>);
    expect(events).toEqual(['first:detach', 'second:attach']);
    expect(objectRefs.every((ref) => ref.current instanceof HTMLButtonElement)).toBe(true);

    events.length = 0;
    render(<></>);
    expect(events).toEqual(['second:detach']);
    expect(objectRefs.every((ref) => ref.current === null)).toBe(true);
  });
});

describe('primitive interceptors', () => {
  function Probe({
    run,
    render: renderElement,
    ...props
  }: ComponentPropsWithRef<'button'> & { run: boolean; render?: ReactElement }) {
    return useRender({
      name: 'Probe',
      tag: 'button',
      render: renderElement,
      ref: undefined,
      props,
      interceptors: {
        onClick(_, next) {
          order.push('before');
          if (run) next();
          order.push('after');
        },
      },
    });
  }
  const order: string[] = [];

  it('decide whether and when consumers handlers run', () => {
    const consumer = () => order.push('consumer');
    const element = <button onClick={() => order.push('element')} />;

    render(<Probe run onClick={consumer} render={element} />);
    container.querySelector('button')!.click();
    expect(order.splice(0)).toEqual(['before', 'element', 'consumer', 'after']);

    render(<Probe run={false} onClick={consumer} render={element} />);
    container.querySelector('button')!.click();
    expect(order.splice(0)).toEqual(['before', 'after']);
  });
});

// Minimal test fixtures: just enough of a tooltip and a popover trigger to
// compose with the real Button.
type TriggerProps = ComponentPropsWithRef<'button'> & ComposableProps<'button'>;

function TooltipTrigger({
  label,
  render: renderElement,
  ref,
  ...props
}: TriggerProps & { label: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const trigger = useRender({
    name: 'Tooltip.Trigger',
    tag: 'button',
    render: renderElement,
    ref,
    props: mergeProps(props, { 'aria-describedby': open ? id : undefined }),
    interceptors: {
      onPointerEnter: (_, next) => {
        next();
        setOpen(true);
      },
      onPointerLeave: (_, next) => {
        next();
        setOpen(false);
      },
      onFocus: (_, next) => {
        next();
        setOpen(true);
      },
      onBlur: (_, next) => {
        next();
        setOpen(false);
      },
    },
  });

  return (
    <>
      {trigger}
      <span role="tooltip" id={id} hidden={!open}>
        {label}
      </span>
    </>
  );
}

function PopoverTrigger({
  disabled,
  render: renderElement,
  ref,
  ...props
}: TriggerProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const trigger = useRender({
    name: 'Popover.Trigger',
    tag: 'button',
    render: renderElement,
    ref,
    props,
    owned: {
      type: 'button',
      ...(disabled && { disabled }),
      'aria-haspopup': 'dialog',
      'aria-expanded': open,
      'aria-controls': id,
    },
    interceptors: {
      onClick(event, next) {
        next();
        if (!event.defaultPrevented) setOpen(!open);
      },
    },
  });

  return (
    <>
      {trigger}
      <div id={id} role="dialog" aria-label="Filters" hidden={!open} />
    </>
  );
}

const popover = () => container.querySelector<HTMLElement>('[role="dialog"]')!;

async function accessibleDescription(name: string) {
  const session = cdp();
  await session.send('Accessibility.enable');
  const { frameTree } = (await session.send('Page.getFrameTree')) as {
    frameTree: FrameTree;
  };
  type FrameTree = { frame: { id: string }; childFrames?: FrameTree[] };
  const frames: string[] = [];
  const walk = (tree: FrameTree) => {
    frames.push(tree.frame.id);
    tree.childFrames?.forEach(walk);
  };
  walk(frameTree);

  for (const frameId of frames) {
    const { nodes } = (await session.send('Accessibility.getFullAXTree', {
      frameId,
    })) as {
      nodes: {
        ignored: boolean;
        role?: { value: string };
        name?: { value: string };
        description?: { value: string };
      }[];
    };
    const button = nodes.find(
      (node) =>
        !node.ignored && node.role?.value === 'button' && node.name?.value === name,
    );
    if (button) return button.description?.value ?? '';
  }
  return undefined;
}

describe('multi-layer composition', () => {
  it('composes Tooltip.Trigger, Popover.Trigger and Button into one button with independent state', async () => {
    const order: string[] = [];
    render(
      <>
        <span id="hint">Opens the filter panel</span>
        <TooltipTrigger
          label="Filters"
          onClick={() => order.push('tooltip')}
          render={
            <PopoverTrigger
              onClick={() => order.push('popover')}
              render={
                <Button
                  aria-describedby="hint"
                  onClick={() => order.push('button')}
                />
              }
            />
          }
        >
          Filter
        </TooltipTrigger>
      </>,
    );
    const trigger = container.querySelector('button')!;
    const tooltip = container.querySelector<HTMLElement>('[role="tooltip"]')!;

    expect(container.querySelectorAll('button')).toHaveLength(1);
    trigger.focus();
    await settle();
    expect(tooltip.hidden).toBe(false);
    expect(trigger.getAttribute('aria-describedby')).toBe(`hint ${tooltip.id}`);
    expect(await accessibleDescription('Filter')).toBe('Opens the filter panel Filters');

    await userEvent.keyboard('{Enter}');
    expect(order).toEqual(['button', 'popover', 'tooltip']);
    expect(popover().hidden).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(popover().id);
    expect(errors()).toEqual([]);
  });

  it('keeps an outer trigger and its handlers inactive while a composed Button is pending', async () => {
    const onClick = vi.fn();
    render(
      <>
        <PopoverTrigger onClick={onClick} render={<Button pending />}>
          Pending
        </PopoverTrigger>
        <PopoverTrigger disabled render={<Button pending />}>
          Disabled
        </PopoverTrigger>
      </>,
    );
    const [pending, disabled] = container.querySelectorAll('button');

    await userEvent.click(pending, { force: true });
    pending.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onClick).not.toHaveBeenCalled();
    expect(pending.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(pending);

    expect(disabled.disabled).toBe(true);
    expect(disabled.hasAttribute('aria-disabled')).toBe(false);
    expect(disabled.hasAttribute('data-pending')).toBe(true);
    expect(errors()).toEqual([]);
  });

  it('keeps a trigger disabled when any layer disables it', async () => {
    render(
      <>
        <PopoverTrigger disabled render={<Button disabled={false} />}>
          Trigger disables
        </PopoverTrigger>
        <PopoverTrigger disabled={false} render={<Button disabled />}>
          Button disables
        </PopoverTrigger>
        <PopoverTrigger render={<Button render={<button disabled />} />}>
          Element disables
        </PopoverTrigger>
      </>,
    );
    const triggers = [...container.querySelectorAll('button')];

    for (const trigger of triggers) trigger.click();
    await settle();
    expect(triggers.map((trigger) => trigger.disabled)).toEqual([true, true, true]);
    expect(triggers.map((trigger) => trigger.getAttribute('aria-expanded'))).toEqual([
      'false',
      'false',
      'false',
    ]);
    expect(errors()).toEqual([
      'Popover.Trigger: `disabled` is decided by the component and cannot be overridden.',
    ]);
  });

  it('reports two components that decide the same attributes on one button at mount', () => {
    render(
      <PopoverTrigger render={<PopoverTrigger render={<Button />} />}>
        Open
      </PopoverTrigger>,
    );
    const trigger = container.querySelector('button')!;
    const [inner] = container.querySelectorAll('[role="dialog"]');

    expect(trigger.getAttribute('aria-controls')).toBe(inner.id);
    expect(errors()).toEqual([
      'Popover.Trigger: `aria-controls` is decided by the component and cannot be overridden.',
      'Popover.Trigger: the render element did not pass `aria-controls` to its DOM element.',
    ]);
  });

  it('hydrates server HTML without mismatches and reports only on the client', async () => {
    const app = (
      <>
        <PopoverTrigger render={<Button aria-expanded />}>Open</PopoverTrigger>
        <PopoverTrigger render={(props) => <Button {...props} pending />}>
          Open pending
        </PopoverTrigger>
      </>
    );
    const html = renderToString(app);
    expect(errors()).toEqual([]);

    const server = document.body.appendChild(document.createElement('div'));
    server.innerHTML = html;
    const onRecoverableError = vi.fn();
    const hydrated = hydrateRoot(server, app, { onRecoverableError });
    await new Promise((resolve) => setTimeout(resolve, 50));
    const [trigger, pending] = server.querySelectorAll('button');

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(server.innerHTML).toBe(html);
    expect(server.querySelectorAll('button')).toHaveLength(2);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(pending.getAttribute('aria-disabled')).toBe('true');
    expect(errors()).toEqual([
      'Popover.Trigger: `aria-expanded` is decided by the component and cannot be overridden.',
    ]);
    await userEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    hydrated.unmount();
    server.remove();
  });
});
