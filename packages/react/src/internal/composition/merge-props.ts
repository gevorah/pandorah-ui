export type Props = Record<string, unknown>;
type Handler<Args extends unknown[] = never[]> = (...args: Args) => void;

export type MergedProps<Base, Override> = Omit<Base, keyof Override | 'ref'> &
  Omit<Override, keyof Base | 'ref'> & {
    [K in Exclude<keyof Base & keyof Override, 'ref'>]:
      | (undefined extends Override[K] ? Base[K] : never)
      | MergedValue<K, Base[K], Exclude<Override[K], undefined>>;
  };

type MergedValue<Key, Base, Override> = Key extends
  'className' | 'aria-describedby'
  ? JoinedValue<Base, Override>
  : Key extends 'style'
    ? StyleValue<Base, Override>
    : Key extends `on${infer First}${string}`
      ? First extends Lowercase<First>
        ? Override
        : ChainedValue<Base, Override>
      : Override;

type JoinedValue<Base, Override> = Override extends string
  ? Base extends string
    ? string
    : Override
  : Override;

type StyleValue<Base, Override> = Override extends object
  ? Base extends object
    ? MergedStyle<Base, Override>
    : Override
  : Override;

type MergedStyle<Base, Override> = Omit<Base, keyof Override> &
  Omit<Override, keyof Base> & {
    [K in keyof Base & keyof Override]:
      | (undefined extends Override[K] ? Base[K] : never)
      | Exclude<Override[K], undefined>;
  };

type ChainedValue<Base, Override> = Override extends Handler
  ? Base extends Handler
    ? Chained<Base, Override>
    : Override
  : Override;

type Chained<Base extends Handler, Override extends Handler> =
  Base extends Handler<Parameters<Override>>
    ? Handler<Parameters<Override>>
    : Override extends Handler<Parameters<Base>>
      ? Handler<Parameters<Base>>
      : Handler<Parameters<Override> & Parameters<Base>>;

export function mergeProps<Base extends object, Override extends object>(
  base: Base,
  override: Override,
): MergedProps<Base, Override> {
  const merged = { ...base } as Props;
  delete merged.ref;

  for (const [key, value] of Object.entries(override)) {
    if (value === undefined || key === 'ref') continue;
    const current = merged[key];

    if (key === 'className' && isString(current) && isString(value)) {
      merged[key] = joinTokens(current, value);
    } else if (key === 'style' && isObject(current) && isObject(value)) {
      merged[key] = mergeStyles(current, value);
    } else if (
      key === 'aria-describedby' &&
      isString(current) &&
      isString(value)
    ) {
      merged[key] = joinTokens(value, current, { unique: true });
    } else if (isHandlerKey(key) && isFunction(current) && isFunction(value)) {
      merged[key] = chain(value, current);
    } else {
      merged[key] = value;
    }
  }

  return merged as MergedProps<Base, Override>;
}

export function chain(...handlers: Handler[]): Handler {
  return (...args) => {
    for (const handler of handlers) handler(...args);
  };
}

function mergeStyles(base: Props, override: Props): Props {
  const merged: Props = { ...base };
  for (const [property, value] of Object.entries(override)) {
    if (value !== undefined) merged[property] = value;
  }
  return merged;
}

function joinTokens(first: string, second: string, { unique = false } = {}) {
  const tokens = `${first} ${second}`.split(/\s+/).filter(Boolean);
  return (unique ? [...new Set(tokens)] : tokens).join(' ');
}

function isHandlerKey(key: string) {
  return /^on[A-Z]/.test(key);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isObject(value: unknown): value is Props {
  return typeof value === 'object' && value !== null;
}

function isFunction(value: unknown): value is Handler {
  return typeof value === 'function';
}
