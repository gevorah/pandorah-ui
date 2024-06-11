import { forwardRef, type ComponentPropsWithoutRef } from 'react';

export type MenuGroupProps = {} & ComponentPropsWithoutRef<'div'>;

export const MenuGroup = forwardRef<HTMLDivElement, MenuGroupProps>(
  (props, ref) => {
    const { children, ...rest } = props;

    return (
      <div ref={ref} role="group" {...rest}>
        {children}
      </div>
    );
  }
);

