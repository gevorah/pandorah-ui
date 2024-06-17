import { Tooltip as TooltipRoot } from './Tooltip';
import { TooltipContent } from './TooltipContent';
import { TooltipTrigger } from './TooltipTrigger';

const Tooltip = Object.assign(TooltipRoot, {
  Root: TooltipRoot,
  Trigger: TooltipTrigger,
  Content: TooltipContent
});

export { Tooltip, TooltipTrigger, TooltipContent };

export type { TooltipProps } from './Tooltip';
export type { TooltipTriggerProps } from './TooltipTrigger';
export type { TooltipContentProps } from './TooltipContent';

