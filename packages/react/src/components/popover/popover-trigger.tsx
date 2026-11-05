'use client';

import { useRef, type ComponentPropsWithRef } from 'react';

import { useMergeRefs } from '../../internal/composition/use-merge-refs';
import {
  useRender,
  type ComposableProps,
} from '../../internal/composition/use-render';
import { isUnavailable } from '../../internal/is-unavailable';
import { getNativeButtonAttributes } from '../button/button-behavior';
import { usePopoverContext } from './popover-context';

export interface PopoverTriggerProps
  extends ComponentPropsWithRef<'button'>, ComposableProps<'button'> {}

export function PopoverTrigger({
  type,
  disabled,
  render,
  ref,
  ...props
}: PopoverTriggerProps) {
  const { open, popupId, setTrigger, setOpenedByTouch, requestOpenChange } =
    usePopoverContext('Popover.Trigger');
  const pointerTypeRef = useRef('');

  return useRender({
    name: 'Popover.Trigger',
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
      onPointerDown(event, next) {
        next();
        pointerTypeRef.current = event.pointerType;
      },
      onClick(event, next) {
        next();
        const pointerType = event.detail === 0 ? '' : pointerTypeRef.current;
        pointerTypeRef.current = '';
        if (
          event.defaultPrevented ||
          disabled ||
          isUnavailable(event.currentTarget)
        ) {
          return;
        }
        setOpenedByTouch(pointerType === 'touch');
        requestOpenChange(!open, {
          reason: 'trigger-press',
          event: event.nativeEvent,
        });
      },
    },
  });
}
