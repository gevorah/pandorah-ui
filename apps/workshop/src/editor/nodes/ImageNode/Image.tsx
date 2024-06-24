import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import {
  $getNearestBlockElementAncestorOrThrow,
  mergeRegister
} from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  SELECTION_CHANGE_COMMAND,
  type BaseSelection,
  type ElementFormatType,
  type LexicalEditor,
  type NodeKey
} from 'lexical';

import { cn } from '@/lib/utils';

import { $isImageNode } from './ImageNode';
import { LazyImage } from './LazyImage';

export type ImageProps = {
  src: string;
  alt: string;
  width: string | number;
  height: string | number;
  format?: ElementFormatType;
  nodeKey: NodeKey;
  resizable: boolean;
};

export const Image = (props: ImageProps) => {
  const { src, alt, width, height, format, nodeKey, resizable } = props;

  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] =
    useLexicalNodeSelection(nodeKey);

  const [selection, setSelection] = useState<BaseSelection | null>(null);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [isLoadError, setIsLoadError] = useState<boolean>(false);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const activeEditorRef = useRef<LexicalEditor | null>(null);

  const $onDelete = useCallback(
    (event: KeyboardEvent) => {
      if (isSelected && $isNodeSelection($getSelection())) {
        event.preventDefault();
        const node = $getNodeByKey(nodeKey);
        if ($isImageNode(node)) {
          node.remove();
          return true;
        }
      }
      return false;
    },
    [isSelected, nodeKey]
  );

  const onClick = useCallback(
    (event: MouseEvent) => {
      if (isResizing) {
        return true;
      }
      if (event.target === imageRef.current) {
        if (event.shiftKey) {
          setSelected(!isSelected);
        } else {
          clearSelection();
          setSelected(true);
        }
        return true;
      }
      return false;
    },
    [isResizing, isSelected, setSelected, clearSelection]
  );

  useEffect(() => {
    let isMounted = true;

    const unregister = mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        if (isMounted) {
          setSelection(editorState.read(() => $getSelection()));
        }
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        (_, activeEditor) => {
          activeEditorRef.current = activeEditor;
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        FORMAT_ELEMENT_COMMAND,
        (formatType) => {
          if (isSelected) {
            const selection = $getSelection();

            if ($isNodeSelection(selection)) {
              const node = $getNodeByKey(nodeKey);

              if ($isImageNode(node)) {
                node.setFormat(formatType);
              }
            } else if ($isRangeSelection(selection)) {
              const nodes = selection.getNodes();

              for (const node of nodes) {
                if ($isImageNode(node)) {
                  node.setFormat(formatType);
                } else {
                  const element = $getNearestBlockElementAncestorOrThrow(node);
                  element.setFormat(formatType);
                }
              }
            }
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(CLICK_COMMAND, onClick, COMMAND_PRIORITY_LOW),
      editor.registerCommand(
        KEY_DELETE_COMMAND,
        $onDelete,
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        $onDelete,
        COMMAND_PRIORITY_LOW
      )
    );

    return () => {
      isMounted = false;
      unregister();
    };
  }, [
    editor,
    nodeKey,
    isResizing,
    isSelected,
    setSelected,
    clearSelection,
    $onDelete,
    onClick
  ]);

  const draggable = isSelected && $isNodeSelection(selection) && !isResizing;
  const isFocused = isSelected || isResizing;

  return (
    <Suspense fallback={null}>
      <div
        className={cn('relative', {
          'ml-0 mr-auto': format === 'left' || format === 'start',
          'mx-auto': format === 'center' || format === 'justify',
          'ml-auto mr-0': format === 'right' || format === 'end'
        })}
        style={{ width, height }}
      >
        <div draggable={draggable}>
          <LazyImage
            ref={imageRef}
            src={src}
            alt={alt}
            className={cn(
              'h-auto w-full max-w-full',
              isFocused && 'outline outline-2 outline-blue-600',
              isFocused && $isNodeSelection(selection) && 'cursor-grab'
            )}
          />
        </div>
      </div>
    </Suspense>
  );
};

