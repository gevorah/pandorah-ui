import { useMemo, useRef, type MutableRefObject } from 'react';
import {
  arrow,
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
  type Middleware,
  type OffsetOptions,
  type Placement,
  type Strategy,
  type UseFloatingReturn
} from '@floating-ui/react';

import { useControllableState } from '../../../hooks/useControllableState';

function calculateOffset(offset: OffsetOptions, arrow: SVGSVGElement | null) {
  if (typeof offset === 'number') {
    return offset + (arrow?.getBoundingClientRect().height ?? 0) / 2;
  }
  return offset;
}

export type UsePopupOptions = {
  placement?: Placement;
  strategy?: Strategy;
  middleware?: Array<Middleware | null | undefined | false>;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  nodeId?: string;
  offset?: OffsetOptions;
};

export type UsePopupReturn = {
  floating: UseFloatingReturn;
  open: boolean;
  setOpen: (open: boolean) => void;
  arrowRef: MutableRefObject<SVGSVGElement | null>;
};

export function usePopup(options: UsePopupOptions): UsePopupReturn {
  const {
    placement = 'bottom',
    strategy = 'absolute',
    middleware,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    nodeId,
    offset: offsetProp = 0
  } = options;

  const [open, setOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange
  });

  const arrowRef = useRef<SVGSVGElement | null>(null);

  const offsetOptions = useMemo(
    () => calculateOffset(offsetProp, arrowRef.current),
    [offsetProp, arrowRef.current]
  );

  const floating = useFloating({
    placement,
    strategy,
    middleware: middleware ?? [
      offset(offsetOptions),
      flip(),
      shift(),
      arrow({ element: arrowRef })
    ],
    whileElementsMounted: autoUpdate,
    open,
    onOpenChange: setOpen,
    nodeId
  });

  return useMemo(
    () => ({ floating, open, setOpen, arrowRef }),
    [floating, open, setOpen, arrowRef]
  );
}

