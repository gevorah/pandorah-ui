import { isValidElement, type ButtonHTMLAttributes } from 'react';

import type {
  ComposableProps,
  UseRenderOptions,
} from '../../internal/composition/use-render';

type ButtonBehavior = Pick<
  UseRenderOptions<'button'>,
  'owned' | 'interceptors'
>;
type Interceptors = NonNullable<ButtonBehavior['interceptors']>;

interface NativeButtonState {
  render: ComposableProps<'button'>['render'];
  type: ButtonHTMLAttributes<HTMLButtonElement>['type'];
  disabled: boolean | undefined;
}

interface ButtonState extends NativeButtonState {
  pending: boolean | undefined;
}

export function getNativeButtonAttributes({
  render,
  type,
  disabled,
}: NativeButtonState) {
  const rendersOtherElement =
    isValidElement(render) &&
    typeof render.type === 'string' &&
    render.type !== 'button';
  const resolvedType = type ?? (rendersOtherElement ? undefined : 'button');
  return {
    ...(resolvedType && { type: resolvedType }),
    ...(disabled && { disabled }),
  };
}

export function getButtonBehavior({
  render,
  type,
  disabled,
  pending,
}: ButtonState): ButtonBehavior {
  return {
    owned: {
      ...getNativeButtonAttributes({ render, type, disabled }),
      'aria-disabled': (pending && !disabled) || undefined,
      'data-pending': pending || undefined,
    },
    interceptors: pending ? pendingInterceptors : undefined,
  };
}

const pendingInterceptors: Interceptors = {
  onClick(event) {
    event.preventDefault();
  },
  onDoubleClick() {},
  onPointerDown() {},
  onPointerUp() {},
  onMouseDown() {},
  onMouseUp() {},
  onTouchStart() {},
  onTouchEnd() {},
  onKeyDown(event, next) {
    if (event.key !== 'Enter' && event.key !== ' ') next();
  },
  onKeyUp(event, next) {
    if (event.key !== 'Enter' && event.key !== ' ') next();
  },
};
