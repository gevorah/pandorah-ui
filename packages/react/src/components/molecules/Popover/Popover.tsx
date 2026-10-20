'use client';

import type { Ref } from 'react';
import { composeRenderProps } from 'react-aria-components/composeRenderProps';
import {
  Popover as AriaPopover,
  OverlayArrow,
  type PopoverProps as AriaPopoverProps,
} from 'react-aria-components/Popover';

import styles from './Popover.module.css';

export type PopoverProps = AriaPopoverProps & {
  ref?: Ref<HTMLElement>;
  showArrow?: boolean;
};

export function Popover({
  className,
  children,
  showArrow = false,
  ...props
}: PopoverProps) {
  return (
    <AriaPopover
      {...props}
      className={composeRenderProps(className, (className) =>
        className ? `${styles.popover} ${className}` : styles.popover,
      )}
    >
      {composeRenderProps(children, (children) => (
        <>
          {showArrow && (
            <OverlayArrow>
              <svg
                width={12}
                height={12}
                viewBox="0 0 12 12"
                aria-hidden="true"
                className={styles.arrow}
              >
                <path d="M0 0 L6 6 L12 0" />
              </svg>
            </OverlayArrow>
          )}
          {children}
        </>
      ))}
    </AriaPopover>
  );
}
