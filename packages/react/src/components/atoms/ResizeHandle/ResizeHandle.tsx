import { type ComponentPropsWithoutRef, forwardRef } from 'react';
import { type VariantProps, cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const resizeHandleVariants = cva(
  ['absolute block w-2 h-2 border border-white bg-blue-500'],
  {
    variants: {
      direction: {
        north: '-top-1.5 left-[48%] cursor-n-resize',
        east: 'bottom-[48%] -right-1.5 cursor-e-resize',
        south: '-bottom-1.5 left-[48%] cursor-s-resize',
        west: 'bottom-[48%] -left-1.5 cursor-w-resize',
        'north-east': '-top-1.5 -right-1.5 cursor-ne-resize',
        'south-east': '-bottom-1.5 -right-1.5 cursor-se-resize',
        'south-west': '-bottom-1.5 -left-1.5 cursor-sw-resize',
        'north-west': '-top-1.5 -left-1.5 cursor-nw-resize'
      }
    },
    defaultVariants: { direction: 'north' }
  }
);

interface ResizeHandleProps
  extends ComponentPropsWithoutRef<'div'>,
    VariantProps<typeof resizeHandleVariants> {}

export const ResizeHandle = forwardRef<HTMLDivElement, ResizeHandleProps>(
  ({ className, direction, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(resizeHandleVariants({ direction, className }))}
        {...props}
      />
    );
  }
);

ResizeHandle.displayName = 'ResizeHandle';

