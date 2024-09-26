import { useCallback, useEffect, useState } from 'react';
import { $isImageNode } from '@/editor/nodes/ImageNode';
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useFloating
} from '@floating-ui/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import {
  $getSelection,
  $isNodeSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  SELECTION_CHANGE_COMMAND
} from 'lexical';

export const ImageToolbarPlugin = () => {
  const [editor] = useLexicalComposerContext();

  const [open, setOpen] = useState<boolean>(false);

  const { context, refs, floatingStyles } = useFloating({
    placement: 'bottom',
    strategy: 'absolute',
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip(), shift()],
    open,
    onOpenChange: setOpen
  });

  const $updateImageToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isNodeSelection(selection)) {
      const node = selection.getNodes()[0];

      if ($isImageNode(node)) {
        const element = editor.getElementByKey(node.getKey());
        if (element) {
          refs.setReference(element.firstElementChild);
          setOpen(true);
        }
      }
    } else {
      setOpen(false);
    }
  }, [editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateImageToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          $updateImageToolbar();
          return false;
        },
        COMMAND_PRIORITY_LOW
      )
    );
  }, [editor]);

  if (!context.open || !editor.isEditable()) return null;

  return (
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        style={floatingStyles}
        className="space-x-2 rounded-md bg-white p-1 shadow-md"
      >
        <button type="button">Crop</button>
        <button
          type="button"
          onClick={() =>
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')
          }
        >
          Center
        </button>
      </div>
    </FloatingPortal>
  );
};

