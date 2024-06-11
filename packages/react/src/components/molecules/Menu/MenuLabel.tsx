import { forwardRef, type ComponentPropsWithoutRef } from 'react';

export type MenuLabelProps = {} & ComponentPropsWithoutRef<'p'>;

export const MenuLabel = forwardRef<HTMLParagraphElement, MenuLabelProps>(
  (props, ref) => {
    const { children, ...rest } = props;

    return (
      <p ref={ref} {...rest}>
        {children}
      </p>
    );
  }
);

