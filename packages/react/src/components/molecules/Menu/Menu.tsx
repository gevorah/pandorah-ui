import { type ReactNode } from 'react';
import { FloatingTree } from '@floating-ui/react';

import { MenuComponent } from './MenuComponent';
import { MenuItem } from './MenuItem';
import { MenuList } from './MenuList';
import { MenuSub } from './MenuSub';
import { MenuTrigger } from './MenuTrigger';
import { type UseMenuOptions } from './useMenu';

interface MenuProps extends Omit<UseMenuOptions, 'arrowRef'> {
  children: ReactNode;
}

export function Menu(props: MenuProps) {
  const { placement = 'bottom', trigger = 'click', children, ...rest } = props;

  return (
    <FloatingTree>
      <MenuComponent {...rest} placement={placement} trigger={trigger}>
        {children}
      </MenuComponent>
    </FloatingTree>
  );
}

Menu.Trigger = MenuTrigger;
Menu.List = MenuList;
Menu.Item = MenuItem;
Menu.Sub = MenuSub;
Menu.displayName = 'Menu';

