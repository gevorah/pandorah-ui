import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type FocusEvent,
  type MouseEvent
} from 'react';
import { useFloatingTree, useListItem, useMergeRefs } from '@floating-ui/react';

import { Button } from '../../atoms/Button';
import { useMenuContext } from './Menu.context';

export interface MenuItemProps extends ComponentPropsWithoutRef<'button'> {}

export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(
  (props, ref) => {
    const { children, disabled, ...rest } = props;

    const context = useMenuContext();
    const tree = useFloatingTree();
    const item = useListItem({
      label: disabled ? null : rest['aria-label']
    });
    const isActive = item.index === context.activeIndex;

    const itemRef = useMergeRefs([item.ref, ref]);

    const onClick = (event: MouseEvent<HTMLButtonElement>) => {
      rest.onClick?.(event);
      tree?.events.emit('click');
    };

    const onFocus = (event: FocusEvent<HTMLButtonElement>) => {
      rest.onFocus?.(event);
      context.setHasFocusInside(true);
    };

    return (
      <Button
        {...rest}
        ref={itemRef}
        type="button"
        disabled={disabled}
        role="menuitem"
        tabIndex={isActive ? 0 : -1}
        variant="ghost"
        {...context.interactions.getItemProps({ onClick, onFocus })}
      >
        {children}
      </Button>
    );
  }
);

