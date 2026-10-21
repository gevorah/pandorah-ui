import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

const directionClassNames = {
  north: '-top-1.5 left-[48%] cursor-n-resize',
  east: '-right-1.5 bottom-[48%] cursor-e-resize',
  south: '-bottom-1.5 left-[48%] cursor-s-resize',
  west: '-left-1.5 bottom-[48%] cursor-w-resize',
  'north-east': '-right-1.5 -top-1.5 cursor-ne-resize',
  'south-east': '-bottom-1.5 -right-1.5 cursor-se-resize',
  'south-west': '-bottom-1.5 -left-1.5 cursor-sw-resize',
  'north-west': '-left-1.5 -top-1.5 cursor-nw-resize',
};

export type ResizeHandleProps = ComponentProps<'div'> & {
  direction?: keyof typeof directionClassNames;
};

export function ResizeHandle({
  direction = 'north',
  className,
  ...props
}: ResizeHandleProps) {
  return (
    <div
      {...props}
      className={cn(
        'absolute block h-2 w-2 border border-white bg-blue-500',
        directionClassNames[direction],
        className,
      )}
    />
  );
}
