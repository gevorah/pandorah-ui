import { Tooltip as TooltipRoot } from './Tooltip';
import { TooltipArrow } from './TooltipArrow';
import { TooltipContent } from './TooltipContent';
import { TooltipTrigger } from './TooltipTrigger';

const Tooltip = Object.assign(TooltipRoot, {
  Root: TooltipRoot,
  Trigger: TooltipTrigger,
  Content: TooltipContent,
  Arrow: TooltipArrow
});

export { Tooltip, TooltipTrigger, TooltipContent, TooltipArrow };

export type { TooltipProps } from './Tooltip';
export type { TooltipTriggerProps } from './TooltipTrigger';
export type { TooltipContentProps } from './TooltipContent';
export type { TooltipArrowProps } from './TooltipArrow';

