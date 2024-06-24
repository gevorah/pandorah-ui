import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../../lib/utils';

const resizeHandleVariants = cva(
  ['absolute block h-2 w-2 border border-white bg-blue-500'],
  {
    variants: {
      direction: {
        north: '-top-1.5 left-[48%] cursor-n-resize',
        east: '-right-1.5 bottom-[48%] cursor-e-resize',
        south: '-bottom-1.5 left-[48%] cursor-s-resize',
        west: '-left-1.5 bottom-[48%] cursor-w-resize',
        'north-east': '-right-1.5 -top-1.5 cursor-ne-resize',
        'south-east': '-bottom-1.5 -right-1.5 cursor-se-resize',
        'south-west': '-bottom-1.5 -left-1.5 cursor-sw-resize',
        'north-west': '-left-1.5 -top-1.5 cursor-nw-resize'
      }
    },
    defaultVariants: { direction: 'north' }
  }
);

export type ResizeHandleProps = {} & ComponentPropsWithoutRef<'div'> &
  VariantProps<typeof resizeHandleVariants>;

export const ResizeHandle = forwardRef<HTMLDivElement, ResizeHandleProps>(
  (props, ref) => {
    const { direction, className, ...rest } = props;

    return (
      <div
        ref={ref}
        className={cn(resizeHandleVariants({ direction, className }))}
        {...rest}
      />
    );
  }
);

ResizeHandle.displayName = 'ResizeHandle';

