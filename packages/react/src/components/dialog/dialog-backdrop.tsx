'use client';

import { FloatingPortal } from '@floating-ui/react';
import type { ComponentPropsWithRef } from 'react';

import { useMergeRefs } from '../../internal/composition/use-merge-refs';
import {
  useRender,
  type ComposableProps,
} from '../../internal/composition/use-render';
import { DialogBackdropContext, useDialogContext } from './dialog-context';

export interface DialogBackdropProps
  extends ComponentPropsWithRef<'div'>, ComposableProps<'div'> {}

export function DialogBackdrop(props: DialogBackdropProps) {
  const { mounted, rejected } = useDialogContext('Dialog.Backdrop');
  if (!mounted || rejected) return null;
  return (
    <FloatingPortal>
      <BackdropElement {...props} />
    </FloatingPortal>
  );
}

function BackdropElement({ render, ref, ...props }: DialogBackdropProps) {
  const { open, setBackdrop } = useDialogContext('Dialog.Backdrop');
  const element = useRender({
    name: 'Dialog.Backdrop',
    tag: 'div',
    render,
    ref: useMergeRefs(ref, setBackdrop),
    props,
    owned: {
      'data-state': open ? 'open' : 'closed',
    },
  });
  return <DialogBackdropContext value>{element}</DialogBackdropContext>;
}
