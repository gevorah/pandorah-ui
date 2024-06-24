import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { calculateZoomLevel } from '@lexical/utils';
import { ResizeHandle } from '@pandorah-ui/react';
import type { LexicalEditor } from 'lexical';

import { clamp } from '../utils/clamp';

const Direction = {
  east: 1 << 0,
  north: 1 << 3,
  south: 1 << 1,
  west: 1 << 2
};

type ImageResizerProps = {
  imageRef: { current: HTMLElement | null };
  editor: LexicalEditor;
  onResizeStart: () => void;
  onResizeEnd: (width: string | number, height: string | number) => void;
  maxWidth?: string | number;
};

type UserSelect = {
  priority: string;
  value: string;
};

type Positioning = {
  startWidth: number;
  startHeight: number;
  startX: number;
  startY: number;
  direction: number;
  isResizing: boolean;
  ratio: number;
  currentWidth: string | number;
  currentHeight: string | number;
};

export const ImageResizer = (props: ImageResizerProps) => {
  const { editor, imageRef, onResizeStart, onResizeEnd } = props;

  const controlWrapperRef = useRef<HTMLDivElement>(null);
  const userSelect = useRef<UserSelect>({
    priority: '',
    value: 'default'
  });
  const positioningRef = useRef<Positioning>({
    startWidth: 0,
    startHeight: 0,
    startX: 0,
    startY: 0,
    direction: 0,
    isResizing: false,
    ratio: 0,
    currentWidth: 0,
    currentHeight: 0
  });
  const editorRootElement = editor.getRootElement();

  const minWidth = 96;
  const maxWidthContainer =
    editorRootElement !== null
      ? editorRootElement.getBoundingClientRect().width
      : 96;

  const setStartCursor = (direction: number) => {
    const ew = direction === Direction.east || direction === Direction.west;
    const ns = direction === Direction.north || direction === Direction.south;
    const nwse =
      (direction & Direction.north && direction & Direction.west) ||
      (direction & Direction.south && direction & Direction.east);

    const cursorDir = ew ? 'ew' : ns ? 'ns' : nwse ? 'nwse' : 'nesw';

    if (editorRootElement !== null) {
      editorRootElement.style.setProperty(
        'cursor',
        `${cursorDir}-resize`,
        'important'
      );
    }
    if (document.body !== null) {
      document.body.style.setProperty(
        'cursor',
        `${cursorDir}-resize`,
        'important'
      );
      userSelect.current.value = document.body.style.getPropertyValue(
        '-webkit-user-select'
      );
      userSelect.current.priority = document.body.style.getPropertyPriority(
        '-webkit-user-select'
      );
      document.body.style.setProperty(
        '-webkit-user-select',
        `none`,
        'important'
      );
    }
  };

  const setEndCursor = () => {
    if (editorRootElement !== null) {
      editorRootElement.style.setProperty('cursor', 'text');
    }
    if (document.body !== null) {
      document.body.style.setProperty('cursor', 'default');
      document.body.style.setProperty(
        '-webkit-user-select',
        userSelect.current.value,
        userSelect.current.priority
      );
    }
  };

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    direction: number
  ) => {
    if (!editor.isEditable()) {
      return;
    }

    const image = imageRef.current;
    const controlWrapper = controlWrapperRef.current;

    if (image !== null && controlWrapper !== null) {
      event.preventDefault();
      const { width, height } = image.getBoundingClientRect();
      const zoom = calculateZoomLevel(image);
      const positioning = positioningRef.current;
      positioning.startWidth = width;
      positioning.startHeight = height;
      positioning.ratio = width / height;
      // positioning.currentWidth = width;
      // positioning.currentHeight = height;
      positioning.startX = event.clientX / zoom;
      positioning.startY = event.clientY / zoom;
      positioning.isResizing = true;
      positioning.direction = direction;

      setStartCursor(direction);
      onResizeStart();

      controlWrapper.classList.add('touch-none');
      // image.style.height = `${height}px`;
      // image.style.width = `${width}px`;

      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
    }
  };

  const handlePointerMove = (event: PointerEvent) => {
    const image = imageRef.current;
    const positioning = positioningRef.current;

    // const isHorizontal =
    //   positioning.direction & (Direction.east | Direction.west);
    // const isVertical =
    //   positioning.direction & (Direction.south | Direction.north);

    if (image !== null && positioning.isResizing) {
      const zoom = calculateZoomLevel(image);

      let diff = Math.floor(positioning.startX - event.clientX / zoom);
      diff = positioning.direction & Direction.east ? -diff : diff;

      const width = clamp(
        positioning.startWidth + diff,
        minWidth,
        maxWidthContainer
      );
      const height = width / positioning.ratio;

      const widthCent = (width / maxWidthContainer) * 100;
      image.style.width = `${widthCent}%`;

      positioning.currentWidth = widthCent;
      positioning.currentHeight = height;
    }
  };

  const handlePointerUp = () => {
    const image = imageRef.current;
    const positioning = positioningRef.current;
    const controlWrapper = controlWrapperRef.current;
    if (image !== null && controlWrapper !== null && positioning.isResizing) {
      const width = positioning.currentWidth;
      const height = positioning.currentHeight;
      positioning.startWidth = 0;
      positioning.startHeight = 0;
      positioning.ratio = 0;
      positioning.startX = 0;
      positioning.startY = 0;
      positioning.isResizing = false;

      controlWrapper.classList.remove('touch-none');

      setEndCursor();
      onResizeEnd(width, height);

      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    }
  };

  return (
    <div ref={controlWrapperRef}>
      <ResizeHandle
        direction="north"
        onPointerDown={(event) => {
          handlePointerDown(event, Direction.north);
        }}
      />
      <ResizeHandle
        direction="east"
        onPointerDown={(event) => {
          handlePointerDown(event, Direction.east);
        }}
      />
      <ResizeHandle
        direction="south"
        onPointerDown={(event) => {
          handlePointerDown(event, Direction.south);
        }}
      />
      <ResizeHandle
        direction="west"
        onPointerDown={(event) => {
          handlePointerDown(event, Direction.west);
        }}
      />
      <ResizeHandle
        direction="north-east"
        onPointerDown={(event) => {
          handlePointerDown(event, Direction.north | Direction.east);
        }}
      />
      <ResizeHandle
        direction="south-east"
        onPointerDown={(event) => {
          handlePointerDown(event, Direction.south | Direction.east);
        }}
      />
      <ResizeHandle
        direction="south-west"
        onPointerDown={(event) => {
          handlePointerDown(event, Direction.south | Direction.west);
        }}
      />
      <ResizeHandle
        direction="north-west"
        onPointerDown={(event) => {
          handlePointerDown(event, Direction.north | Direction.west);
        }}
      />
    </div>
  );
};

