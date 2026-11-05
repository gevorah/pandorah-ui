import type { UseRenderOptions } from './composition/use-render';

type Interceptors = NonNullable<UseRenderOptions<'div'>['interceptors']>;
type Interceptor = (event: unknown, next: () => void) => void;

export function splitFloatingProps(floatingProps: Record<string, unknown>) {
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
    interceptors: interceptors as Interceptors,
  };
}
