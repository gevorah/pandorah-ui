'use client';

import type { ComponentPropsWithRef } from 'react';

import { useMergeRefs } from '../../internal/composition/use-merge-refs';
import {
  useRender,
  type ComposableProps,
} from '../../internal/composition/use-render';
import { splitFloatingProps } from '../../internal/split-floating-props';
import { getNativeButtonAttributes } from '../button/button-behavior';
import { useTooltipContext } from './tooltip-context';

export interface TooltipTriggerProps
  extends ComponentPropsWithRef<'button'>, ComposableProps<'button'> {}

export function TooltipTrigger({
  type,
  disabled,
  render,
  ref,
  ...props
}: TooltipTriggerProps) {
  const { getReferenceProps, setTrigger, popupId, described } =
    useTooltipContext('Tooltip.Trigger');
  const { interceptors } = splitFloatingProps<'button'>(getReferenceProps());

  return useRender({
    name: 'Tooltip.Trigger',
    tag: 'button',
    render,
    ref: useMergeRefs(ref, setTrigger),
    props: {
      ...props,
      'aria-describedby':
        [props['aria-describedby'], described ? popupId : undefined]
          .filter(Boolean)
          .join(' ') || undefined,
    },
    owned: getNativeButtonAttributes({ render, type, disabled }),
    interceptors,
  });
}
