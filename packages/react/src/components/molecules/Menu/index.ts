'use client';

import { Menu as MenuRoot } from './Menu';
import { MenuArrow } from './MenuArrow';
import { MenuDivider } from './MenuDivider';
import { MenuGroup } from './MenuGroup';
import { MenuItem } from './MenuItem';
import { MenuLabel } from './MenuLabel';
import { MenuList } from './MenuList';
import { MenuSub } from './MenuSub';
import { MenuSubTrigger } from './MenuSubTrigger';
import { MenuTrigger } from './MenuTrigger';

const Menu = Object.assign(MenuRoot, {
  Root: MenuRoot,
  Trigger: MenuTrigger,
  List: MenuList,
  Item: MenuItem,
  Sub: MenuSub,
  SubTrigger: MenuSubTrigger,
  Divider: MenuDivider,
  Group: MenuGroup,
  Label: MenuLabel,
  Arrow: MenuArrow
});

export {
  Menu,
  MenuTrigger,
  MenuList,
  MenuItem,
  MenuSub,
  MenuSubTrigger,
  MenuDivider,
  MenuGroup,
  MenuLabel,
  MenuArrow
};

export type { MenuProps } from './Menu';
export type { MenuTriggerProps } from './MenuTrigger';
export type { MenuListProps } from './MenuList';
export type { MenuItemProps } from './MenuItem';
export type { MenuSubProps } from './MenuSub';
export type { MenuSubTriggerProps } from './MenuSubTrigger';
export type { MenuDividerProps } from './MenuDivider';
export type { MenuGroupProps } from './MenuGroup';
export type { MenuLabelProps } from './MenuLabel';
export type { MenuArrowProps } from './MenuArrow';

