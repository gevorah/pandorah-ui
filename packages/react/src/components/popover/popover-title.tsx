'use client';

import type { ComponentPropsWithRef } from 'react';

import {
  useRender,
  type ComposableProps,
} from '../../internal/composition/use-render';
import { useRegisteredId } from '../../internal/use-registered-id';
import { usePopoverContext } from './popover-context';

export interface PopoverTitleProps
  extends ComponentPropsWithRef<'h2'>, ComposableProps<'h2'> {}

export function PopoverTitle({ id, render, ref, ...props }: PopoverTitleProps) {
  const { setTitleId } = usePopoverContext('Popover.Title');
  const registered = useRegisteredId(id, ref, setTitleId);

  return useRender({
    name: 'Popover.Title',
    tag: 'h2',
    render,
    ref: registered.ref,
    props: { ...props, id: registered.id },
  });
}
