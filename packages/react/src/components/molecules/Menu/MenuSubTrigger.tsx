import { type FocusEvent } from 'react';
import { useListItem, useMergeRefs } from '@floating-ui/react';

import { polymorphicForwardRef } from '../../../lib/forward-ref';
import type { PolymorphicProps } from '../../../types/polymorphic';
import { useMenuContext } from './Menu.context';

export type MenuSubTriggerProps = PolymorphicProps<'button'>;

export const MenuSubTrigger = polymorphicForwardRef<
  'button',
  MenuSubTriggerProps
>((props, ref) => {
  const { as: Component = 'button', children, ...rest } = props;

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
        ...rest,
        onFocus
      })
    )
  };

  return <Component {...subTriggerProps}>{children}</Component>;
});

