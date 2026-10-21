'use client';

import type { Ref } from 'react';
import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps
} from 'react-aria-components/Button';
import { composeRenderProps } from 'react-aria-components/composeRenderProps';

import styles from './Button.module.css';

export type ButtonProps = AriaButtonProps & {
  ref?: Ref<HTMLButtonElement>;
  variant?: 'solid' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
};

export function Button({
  variant = 'solid',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  return (
    <AriaButton
      {...props}
      data-variant={variant}
      data-size={size}
      className={composeRenderProps(className, (className) =>
        className ? `${styles.button} ${className}` : styles.button
      )}
    />
  );
}
