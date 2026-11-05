'use client';

import type { FloatingRootContext } from '@floating-ui/react';
import { createContext, useContext } from 'react';

export type TooltipOpenChangeReason =
  'trigger-hover' | 'trigger-focus' | 'trigger-press' | 'escape-key';

export interface TooltipOpenChangeDetails {
  reason: TooltipOpenChangeReason;
  event: Event;
}

export interface TooltipContextValue {
  open: boolean;
  mounted: boolean;
  floating: FloatingRootContext;
  nodeId: string | undefined;
  getReferenceProps: () => Record<string, unknown>;
  setTrigger: (element: Element | null) => void;
  setPopup: (element: HTMLElement | null) => void;
  popupId: string;
  described: boolean;
}

export const TooltipContext = createContext<TooltipContextValue | null>(null);

export function useTooltipContext(part: string) {
  const context = useContext(TooltipContext);
  if (!context)
    throw new Error(`${part} must be rendered inside Tooltip.Root.`);
  return context;
}
