import { Popover as PopoverRoot } from './Popover';
import { PopoverArrow } from './PopoverArrow';
import { PopoverContent } from './PopoverContent';
import { PopoverTrigger } from './PopoverTrigger';

const Popover = Object.assign(PopoverRoot, {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Content: PopoverContent,
  Arrow: PopoverArrow
});

export { Popover, PopoverTrigger, PopoverContent, PopoverArrow };

export type { PopoverProps } from './Popover';
export type { PopoverTriggerProps } from './PopoverTrigger';
export type { PopoverContentProps } from './PopoverContent';
export type { PopoverArrowProps } from './PopoverArrow';

