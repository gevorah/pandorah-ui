import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../../lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center whitespace-nowrap',
    'rounded-lg transition-colors',
    'font-medium text-base leading-normal tracking-normal',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-60'
  ],
  {
    variants: {
      variant: {
        solid: 'bg-blue-500 text-white hover:bg-blue-600',
        outline: 'border border-blue-600 text-blue-600 hover:bg-gray-100',
        ghost: 'hover:bg-gray-100'
      },
      size: {
        sm: 'h-8 px-2 py-1',
        md: 'h-9 px-4 py-1.5',
        lg: 'h-11 px-6 py-2'
      }
    },
    defaultVariants: {
      variant: 'solid',
      size: 'md'
    }
  }
);

interface ButtonProps
  extends ComponentPropsWithoutRef<'button'>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

