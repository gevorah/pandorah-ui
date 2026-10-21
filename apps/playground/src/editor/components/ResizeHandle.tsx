import type { ComponentProps } from 'react';

import styles from './ResizeHandle.module.css';

export type ResizeHandleProps = ComponentProps<'div'> & {
  direction?:
    | 'north'
    | 'east'
    | 'south'
    | 'west'
    | 'north-east'
    | 'south-east'
    | 'south-west'
    | 'north-west';
};

export function ResizeHandle({
  direction = 'north',
  className,
  ...props
}: ResizeHandleProps) {
  return (
    <div
      {...props}
      data-direction={direction}
      className={className ? `${styles.handle} ${className}` : styles.handle}
    />
  );
}
