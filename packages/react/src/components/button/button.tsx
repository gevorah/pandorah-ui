'use client';

import type { ComponentPropsWithRef } from 'react';

import {
  useRender,
  type ComposableProps,
} from '../../internal/composition/use-render';
import { getButtonBehavior } from './button-behavior';

export interface ButtonProps
  extends ComponentPropsWithRef<'button'>, ComposableProps<'button'> {
  pending?: boolean;
}

export function Button({
  type,
  disabled,
  pending,
  render,
  ref,
  ...props
}: ButtonProps) {
  return useRender({
    name: 'Button',
    tag: 'button',
    render,
    ref,
    props,
    ...getButtonBehavior({ type, disabled, pending }),
  });
}
