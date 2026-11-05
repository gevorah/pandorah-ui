import type { JSX } from 'react';

import type { UseRenderOptions } from './composition/use-render';

type Tag = keyof JSX.IntrinsicElements;
type Interceptors<T extends Tag> = NonNullable<
  UseRenderOptions<T>['interceptors']
>;
type Interceptor = (event: unknown, next: () => void) => void;

export function splitFloatingProps<T extends Tag = 'div'>(
  floatingProps: Record<string, unknown>,
) {
  const { tabIndex, ...rest } = floatingProps;
  const attributes: Record<string, unknown> = {};
  const interceptors: Record<string, Interceptor> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (!key.startsWith('on')) {
      attributes[key] = value;
    } else if (typeof value === 'function') {
      interceptors[key] = (event, next) => {
        next();
        value(event);
      };
    }
  }
  return {
    tabIndex: tabIndex as number | undefined,
    attributes,
    interceptors: interceptors as Interceptors<T>,
  };
}
