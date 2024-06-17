import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../../lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center whitespace-nowrap',
    'rounded-md transition-colors',
    'text-base font-medium leading-normal tracking-normal',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-60'
  ],
  {
    variants: {
      variant: {
        solid: 'bg-black text-white hover:bg-neutral-800',
        outline:
          'border border-neutral-800 text-neutral-800 hover:bg-neutral-100',
        ghost: 'hover:bg-neutral-100'
      },
      size: {
        sm: 'h-8 px-2 py-1',
        md: 'h-9 px-4 py-1.5',
        lg: 'h-11 px-6 py-2',
        icon: 'h-8 w-8'
      }
    },
    defaultVariants: {
      variant: 'solid',
      size: 'md'
    }
  }
);

export type ButtonProps = {} & ComponentPropsWithoutRef<'button'> &
  VariantProps<typeof buttonVariants>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    const { className, variant, size, ...rest } = props;

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...rest}
      />
    );
  }
);
Button.displayName = 'Button';

