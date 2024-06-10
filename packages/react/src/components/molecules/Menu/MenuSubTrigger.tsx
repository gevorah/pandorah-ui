import {
  type ComponentPropsWithoutRef,
  type FocusEvent,
  type ReactNode
} from 'react';
import { useListItem, useMergeRefs } from '@floating-ui/react';

import { polymorphicForwardRef } from '../../../lib/forward-ref';
import { useMenuContext } from './Menu.context';

export type MenuSubTriggerProps = {
  children: ReactNode;
} & ComponentPropsWithoutRef<'button'>;

export const MenuSubTrigger = polymorphicForwardRef<
  'button',
  MenuSubTriggerProps
>((props, ref) => {
  const { children, as: Component = 'button', ...rest } = props;

  const context = useMenuContext();
  const item = useListItem();
  const isActive = item.index === context.activeIndex;

  const subTriggerRef = useMergeRefs([context.reference, item.ref, ref]);

  const onFocus = (event: FocusEvent<HTMLButtonElement>) => {
    rest.onFocus?.(event);
  };

  const subTriggerProps = {
    ref: subTriggerRef,
    role: 'menuitem',
    tabIndex: isActive ? 0 : -1,
    'data-state': context.open ? 'open' : 'closed',
    ...context.interactions.getReferenceProps(
      context.interactions.getItemProps({
        onFocus
      })
    )
  };

  return <Component {...subTriggerProps}>{children}</Component>;
});

