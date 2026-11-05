'use client';

import type { ComponentPropsWithRef } from 'react';

import {
  useRender,
  type ComposableProps,
} from '../../internal/composition/use-render';
import { isUnavailable } from '../../internal/is-unavailable';
import { getNativeButtonAttributes } from '../button/button-behavior';
import { useDialogContext } from './dialog-context';

export interface DialogCloseProps
  extends ComponentPropsWithRef<'button'>, ComposableProps<'button'> {}

export function DialogClose({
  type,
  disabled,
  render,
  ref,
  ...props
}: DialogCloseProps) {
  const { requestOpenChange } = useDialogContext('Dialog.Close');

  return useRender({
    name: 'Dialog.Close',
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
