import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction
} from 'react';
import {
  safePolygon,
  useClick,
  useDismiss,
  useFloatingNodeId,
  useFloatingParentNodeId,
  useFloatingTree,
  useHover,
  useInteractions,
  useListNavigation,
  useRole,
  useTypeahead,
  type UseInteractionsReturn
} from '@floating-ui/react';

import { usePopup, type UsePopupOptions, type UsePopupReturn } from '../Popup';

export type UseMenuOptions = {
  trigger?: 'click' | 'hover';
} & UsePopupOptions;

export type UseMenuReturn = {
  interactions: UseInteractionsReturn;
  nodeId: string;
  elementsRef: MutableRefObject<Array<HTMLElement | null>>;
  labelsRef: MutableRefObject<Array<string | null>>;
  activeIndex: number | null;
  setActiveIndex: Dispatch<SetStateAction<number | null>>;
} & UsePopupReturn;

export const useMenu = (options: UseMenuOptions): UseMenuReturn => {
  const { trigger = 'click', ...popup } = options;

  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const elementsRef = useRef<Array<HTMLElement | null>>([]);
  const labelsRef = useRef<Array<string | null>>([]);

  const tree = useFloatingTree();
  const parentId = useFloatingParentNodeId();
  const nodeId = useFloatingNodeId();

  const isNested = parentId != null;

  const { floating, open, setOpen, arrowRef } = usePopup({ ...popup, nodeId });

  const click = useClick(floating.context, {
    enabled: trigger === 'click',
    toggle: !isNested,
    ignoreMouse: isNested
  });
  const hover = useHover(floating.context, {
    enabled: trigger === 'hover',
    delay: { open: 0, close: 100 },
    handleClose: safePolygon({ blockPointerEvents: true })
  });
  const dismiss = useDismiss(floating.context, { bubbles: true });
  const role = useRole(floating.context, { role: 'menu' });
  const listNavigation = useListNavigation(floating.context, {
    listRef: elementsRef,
    activeIndex,
    onNavigate: setActiveIndex,
    nested: isNested
  });
  const typeahead = useTypeahead(floating.context, {
    listRef: labelsRef,
    activeIndex,
    onMatch: setActiveIndex,
    enabled: open
  });

  const interactions = useInteractions([
    click,
    hover,
    dismiss,
    role,
    listNavigation,
    typeahead
  ]);

  useEffect(() => {
    if (!tree) return;

    function handleTreeClick() {
      setOpen(false);
    }

    function onSubMenuOpen(event: { parentId: string; nodeId: string }) {
      if (event.parentId === parentId && event.nodeId !== nodeId) {
        setOpen(false);
      }
    }

    tree.events.on('click', handleTreeClick);
    tree.events.on('menuopen', onSubMenuOpen);

    return () => {
      tree.events.off('click', handleTreeClick);
      tree.events.off('menuopen', onSubMenuOpen);
    };
  }, [open, tree, parentId, nodeId]);

  useEffect(() => {
    if (open && tree) {
      tree.events.emit('menuopen', { parentId, nodeId });
    }
  }, [open, tree, parentId, nodeId]);

  return useMemo(
    () => ({
      floating,
      open,
      setOpen,
      interactions,
      nodeId,
      arrowRef,
      elementsRef,
      labelsRef,
      activeIndex,
      setActiveIndex
    }),
    [
      floating,
      open,
      setOpen,
      interactions,
      nodeId,
      arrowRef,
      elementsRef,
      labelsRef,
      activeIndex,
      setActiveIndex
    ]
  );
};

