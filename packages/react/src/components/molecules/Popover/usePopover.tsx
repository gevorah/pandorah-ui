import { useMemo } from 'react';
import {
  useClick,
  useDismiss,
  useHover,
  useInteractions,
  useRole,
  type UseInteractionsReturn
} from '@floating-ui/react';

import { usePopup, type UsePopupOptions } from '../Popup';
import { type UsePopupReturn } from '../Popup/usePopup';

export interface UsePopoverOptions extends Omit<UsePopupOptions, 'nodeId'> {
  trigger?: 'click' | 'hover';
}

export interface UsePopoverReturn extends UsePopupReturn {
  interactions: UseInteractionsReturn;
}

export function usePopover(options: UsePopoverOptions): UsePopoverReturn {
  const { trigger = 'click', ...popup } = options;

  const { floating, open, setOpen, arrowRef } = usePopup(popup);

  const click = useClick(floating.context, {
    enabled: trigger === 'click'
  });
  const hover = useHover(floating.context, {
    enabled: trigger === 'hover',
    delay: { open: 0, close: 100 }
  });
  const dismiss = useDismiss(floating.context);
  const role = useRole(floating.context, { role: 'dialog' });

  const interactions = useInteractions([click, hover, dismiss, role]);

  return useMemo(
    () => ({ floating, open, setOpen, interactions, arrowRef }),
    [floating, open, setOpen, interactions, arrowRef]
  );
}

