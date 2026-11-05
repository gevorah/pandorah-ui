'use client';

import type { ComponentPropsWithRef } from 'react';

import {
  useRender,
  type ComposableProps,
} from '../../internal/composition/use-render';
import { isUnavailable } from '../../internal/is-unavailable';
import { getNativeButtonAttributes } from '../button/button-behavior';
import { usePopoverContext } from './popover-context';

export interface PopoverCloseProps
  extends ComponentPropsWithRef<'button'>, ComposableProps<'button'> {}

export function PopoverClose({
  type,
  disabled,
  render,
  ref,
  ...props
}: PopoverCloseProps) {
  const { requestOpenChange } = usePopoverContext('Popover.Close');

  return useRender({
    name: 'Popover.Close',
    tag: 'button',
    render,
    ref,
    props,
    owned: getNativeButtonAttributes({ render, type, disabled }),
    interceptors: {
      onClick(event, next) {
        next();
        if (
          event.defaultPrevented ||
          disabled ||
          isUnavailable(event.currentTarget)
        ) {
          return;
        }
        requestOpenChange(false, {
          reason: 'close-press',
          event: event.nativeEvent,
        });
      },
    },
  });
}
