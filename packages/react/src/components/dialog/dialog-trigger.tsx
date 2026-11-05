'use client';

import type { ComponentPropsWithRef } from 'react';

import { useMergeRefs } from '../../internal/composition/use-merge-refs';
import {
  useRender,
  type ComposableProps,
} from '../../internal/composition/use-render';
import { getNativeButtonAttributes } from '../button/button-behavior';
import { useDialogContext } from './dialog-context';
import { isUnavailable } from './is-unavailable';

export interface DialogTriggerProps
  extends ComponentPropsWithRef<'button'>, ComposableProps<'button'> {}

export function DialogTrigger({
  type,
  disabled,
  render,
  ref,
  ...props
}: DialogTriggerProps) {
  const { open, popupId, setTrigger, pressedTriggerRef, requestOpenChange } =
    useDialogContext('Dialog.Trigger');

  return useRender({
    name: 'Dialog.Trigger',
    tag: 'button',
    render,
    ref: useMergeRefs(ref, setTrigger),
    props,
    owned: {
      ...getNativeButtonAttributes({ render, type, disabled }),
      'aria-haspopup': 'dialog',
      'aria-expanded': open,
      'aria-controls': open ? popupId : undefined,
      'data-popup-open': open || undefined,
    },
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
        pressedTriggerRef.current = event.currentTarget;
        requestOpenChange(true, {
          reason: 'trigger-press',
          event: event.nativeEvent,
        });
      },
    },
  });
}
