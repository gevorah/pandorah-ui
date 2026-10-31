import {
  cloneElement,
  createElement,
  Fragment,
  isValidElement,
  useRef,
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  type ComponentRef,
  type JSX,
  type ReactElement,
  type Ref,
} from 'react';

import {
  findElementProblem,
  isDevelopment,
  useDevelopmentDiagnostics,
} from './diagnostics';
import { mergeProps, type Props } from './merge-props';
import { useMergeRefs } from './use-merge-refs';

type Tag = keyof JSX.IntrinsicElements;
type AttributeValue = string | number | boolean | undefined;
type DataAttributes = { [key: `data-${string}`]: AttributeValue };
type ElementProps<T extends Tag> = ComponentPropsWithoutRef<T>;
type Handler = (...args: unknown[]) => void;
type Interceptor = (event: unknown, next: () => void) => void;

type OwnedAttributes<T extends Tag> = {
  [K in keyof ElementProps<T>]?: Extract<ElementProps<T>[K], AttributeValue>;
} & DataAttributes;

type EventOf<H> = H extends (event: infer E) => void ? E : never;

type Interceptors<T extends Tag> = {
  [K in keyof ElementProps<T> as K extends `on${string}` ? K : never]?: (
    event: EventOf<NonNullable<ElementProps<T>[K]>>,
    next: () => void,
  ) => void;
};

export interface ComposableProps<T extends Tag> {
  render?: ReactElement | ((props: ComponentPropsWithRef<T>) => ReactElement);
}

export interface UseRenderOptions<T extends Tag> {
  name: string;
  tag: T;
  render: ComposableProps<T>['render'];
  ref: Ref<ComponentRef<T>> | undefined;
  props: ElementProps<T> & DataAttributes;
  owned?: OwnedAttributes<T>;
  interceptors?: Interceptors<T>;
}

export function useRender<T extends Tag>({
  name,
  tag,
  render,
  ref,
  props,
  owned = {},
  interceptors = {},
}: UseRenderOptions<T>): ReactElement {
  const elementProps =
    render === undefined || typeof render === 'function'
      ? {}
      : (checkRenderElement(name, tag, render, 'be').props as Props);
  // Keeps undefined values: an owned attribute set to undefined must be absent.
  const ownedEntries = Object.entries(owned);
  const problems: string[] = [];

  const merged = mergeProps(
    withoutOwned(name, props, ownedEntries, problems),
    withoutOwned(name, elementProps, ownedEntries, problems),
  );

  for (const [key, interceptor] of definedEntries(interceptors)) {
    const handler = merged[key] as Handler | undefined;
    merged[key] = (...args: unknown[]) =>
      (interceptor as Interceptor)(args[0], () => handler?.(...args));
  }
  Object.assign(merged, Object.fromEntries(ownedEntries));

  const elementRef = useRef<ComponentRef<T>>(null);
  merged.ref = useMergeRefs(
    ref,
    elementProps.ref as Ref<ComponentRef<T>> | undefined,
    elementRef,
  );

  useDevelopmentDiagnostics(problems, () =>
    isDevelopment && render !== undefined
      ? findElementProblem(name, tag, ownedEntries, elementRef.current)
      : undefined,
  );

  if (render === undefined) return createElement(tag, merged);
  if (typeof render !== 'function') return cloneElement(render, merged);

  return checkRenderElement(
    name,
    tag,
    render(merged as ComponentPropsWithRef<T>),
    'return',
  );
}

function checkRenderElement(
  name: string,
  tag: string,
  element: unknown,
  verb: 'be' | 'return',
): ReactElement {
  if (!isValidElement(element) || element.type === Fragment) {
    throw new Error(
      `${name}: \`render\` must ${verb} a single element that renders <${tag}>.`,
    );
  }
  if (typeof element.type === 'string' && element.type !== tag) {
    const received = verb === 'be' ? 'received' : 'returned';
    throw new Error(
      `${name}: \`render\` must ${verb} <${tag}>, but ${received} <${element.type}>.`,
    );
  }

  return element;
}

function definedEntries(object: object) {
  return Object.entries(object).filter(([, value]) => value !== undefined);
}

function withoutOwned(
  name: string,
  props: object,
  ownedEntries: [string, unknown][],
  problems: string[],
): Props {
  const rest: Props = { ...props };

  for (const [key, value] of ownedEntries) {
    if (rest[key] === undefined) continue;
    if (isDevelopment && !Object.is(rest[key], value)) {
      problems.push(
        `${name}: \`${key}\` is decided by the component and cannot be overridden.`,
      );
    }
    delete rest[key];
  }

  return rest;
}
