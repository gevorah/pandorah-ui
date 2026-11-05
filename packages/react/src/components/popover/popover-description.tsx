'use client';

import type { ComponentPropsWithRef } from 'react';

import {
  useRender,
  type ComposableProps,
} from '../../internal/composition/use-render';
import { useRegisteredId } from '../../internal/use-registered-id';
import { usePopoverContext } from './popover-context';

export interface PopoverDescriptionProps
  extends ComponentPropsWithRef<'p'>, ComposableProps<'p'> {}

export function PopoverDescription({
  id,
  render,
  ref,
  ...props
}: PopoverDescriptionProps) {
  const { setDescriptionId } = usePopoverContext('Popover.Description');
  const registered = useRegisteredId(id, ref, setDescriptionId);

  return useRender({
    name: 'Popover.Description',
    tag: 'p',
    render,
    ref: registered.ref,
    props: { ...props, id: registered.id },
  });
}
