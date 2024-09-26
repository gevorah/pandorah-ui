import { type FocusEvent, type MouseEvent } from 'react';
import { useFloatingTree, useListItem, useMergeRefs } from '@floating-ui/react';

import { polymorphicForwardRef } from '../../../lib/forward-ref';
import type { PolymorphicProps } from '../../../types/polymorphic';
import { useMenuContext } from './Menu.context';

export type MenuItemProps = {
  label?: string;
} & PolymorphicProps<'button'>;

export const MenuItem = polymorphicForwardRef<'button', MenuItemProps>(
  (props, ref) => {
    const {
      children,
      as: Component = 'button',
      disabled,
      label,
      ...rest
    } = props;

    const context = useMenuContext();
    const tree = useFloatingTree();
    const item = useListItem({
      label: disabled ? null : label || rest['aria-label']
    });

    const isActive = item.index === context.activeIndex;

    const itemRef = useMergeRefs([item.ref, ref]);

    const onClick = (event: MouseEvent<HTMLButtonElement>) => {
      rest.onClick?.(event);
      tree?.events.emit('click');
    };

    const onFocus = (event: FocusEvent<HTMLButtonElement>) => {
      rest.onFocus?.(event);
    };

    const triggerProps = {
      ref: itemRef,
      role: 'menuitem',
      tabIndex: isActive ? 0 : -1,
      ...context.interactions.getItemProps({
        ...rest,
        disabled,
        'aria-disabled': disabled,
        onClick,
        onFocus
      })
    };

    return <Component {...triggerProps}>{children}</Component>;
  }
);

MenuItem.displayName = 'MenuItem';

