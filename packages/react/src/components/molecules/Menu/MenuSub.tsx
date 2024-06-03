import { type ReactNode } from 'react';

import { MenuComponent } from './MenuComponent';
import { type UseMenuOptions } from './useMenu';

export interface MenuSubProps extends UseMenuOptions {
  children: ReactNode;
}

export function MenuSub(props: MenuSubProps) {
  const {
    placement = 'right-start',
    trigger = 'hover',
    children,
    ...rest
  } = props;

  return (
    <MenuComponent {...rest} placement={placement} trigger={trigger}>
      {children}
    </MenuComponent>
  );
}

