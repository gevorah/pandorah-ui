'use client';

import type { ComponentPropsWithRef } from 'react';

import {
  useRender,
  type ComposableProps,
} from '../../internal/composition/use-render';
import { useDialogContext } from './dialog-context';
import { useRegisteredId } from './use-registered-id';

export interface DialogDescriptionProps
  extends ComponentPropsWithRef<'p'>, ComposableProps<'p'> {}

export function DialogDescription({
  id,
  render,
  ref,
  ...props
}: DialogDescriptionProps) {
  const { setDescriptionId } = useDialogContext('Dialog.Description');
  const registered = useRegisteredId(id, ref, setDescriptionId);

  return useRender({
    name: 'Dialog.Description',
    tag: 'p',
    render,
    ref: registered.ref,
    props: { ...props, id: registered.id },
  });
}
