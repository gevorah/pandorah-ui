import type { ButtonHTMLAttributes } from 'react';

import type { UseRenderOptions } from '../../internal/composition/use-render';

type ButtonBehavior = Pick<
  UseRenderOptions<'button'>,
  'owned' | 'interceptors'
>;
type Interceptors = NonNullable<ButtonBehavior['interceptors']>;

interface ButtonState {
  type: ButtonHTMLAttributes<HTMLButtonElement>['type'];
  disabled: boolean | undefined;
  pending: boolean | undefined;
}

export function getButtonBehavior({
  type = 'button',
  disabled,
  pending,
}: ButtonState): ButtonBehavior {
  return {
    owned: {
      type,
      ...(disabled && { disabled }),
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
