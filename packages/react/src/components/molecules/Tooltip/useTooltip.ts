import { useMemo } from 'react';
import {
  safePolygon,
  useDismiss,
  useFocus,
  useHover,
  useInteractions,
  useRole,
  type UseInteractionsReturn
} from '@floating-ui/react';

import { usePopup, type UsePopupOptions, type UsePopupReturn } from '../Popup';

export type UseTooltipOptions = {} & Omit<UsePopupOptions, 'nodeId'>;

export type UseTooltipReturn = {
  interactions: UseInteractionsReturn;
} & UsePopupReturn;

export const useTooltip = (options: UseTooltipOptions): UseTooltipReturn => {
  const { ...popup } = options;

  const { floating, open, setOpen, arrowRef } = usePopup(popup);

  const hover = useHover(floating.context, {
    enabled: !options.open,
    move: false,
    delay: { open: 0, close: 100 },
    handleClose: safePolygon({ blockPointerEvents: true })
  });
  const focus = useFocus(floating.context, {
    enabled: !options.open
  });
  const dismiss = useDismiss(floating.context);
  const role = useRole(floating.context, { role: 'tooltip' });

  const interactions = useInteractions([hover, focus, dismiss, role]);

  return useMemo(
    () => ({ floating, open, setOpen, interactions, arrowRef }),
    [floating, open, setOpen, interactions, arrowRef]
  );
};

