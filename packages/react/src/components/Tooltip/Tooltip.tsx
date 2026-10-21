'use client';

import type { Ref } from 'react';
import { composeRenderProps } from 'react-aria-components/composeRenderProps';
import {
  Tooltip as AriaTooltip,
  OverlayArrow,
  type TooltipProps as AriaTooltipProps
} from 'react-aria-components/Tooltip';

import styles from './Tooltip.module.css';

export type TooltipProps = AriaTooltipProps & {
  ref?: Ref<HTMLDivElement>;
};

export function Tooltip({
  className,
  children,
  offset = 8,
  ...props
}: TooltipProps) {
  return (
    <AriaTooltip
      {...props}
      offset={offset}
      className={composeRenderProps(className, (className) =>
        className ? `${styles.tooltip} ${className}` : styles.tooltip
      )}
    >
      {composeRenderProps(children, (children) => (
        <>
          <OverlayArrow>
            <svg
              width={8}
              height={8}
              viewBox="0 0 8 8"
              aria-hidden="true"
              className={styles.arrow}
            >
              <path d="M0 0 L4 4 L8 0" />
            </svg>
          </OverlayArrow>
          {children}
        </>
      ))}
    </AriaTooltip>
  );
}
