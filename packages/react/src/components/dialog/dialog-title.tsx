'use client';

import type { ComponentPropsWithRef } from 'react';

import {
  useRender,
  type ComposableProps,
} from '../../internal/composition/use-render';
import { useDialogContext } from './dialog-context';
import { useRegisteredId } from './use-registered-id';

export interface DialogTitleProps
  extends ComponentPropsWithRef<'h2'>, ComposableProps<'h2'> {}

export function DialogTitle({ id, render, ref, ...props }: DialogTitleProps) {
  const { setTitleId } = useDialogContext('Dialog.Title');
  const registered = useRegisteredId(id, ref, setTitleId);

  return useRender({
    name: 'Dialog.Title',
    tag: 'h2',
    render,
    ref: registered.ref,
    props: { ...props, id: registered.id },
  });
}
