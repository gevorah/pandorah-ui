const [editor] = useLexicalComposerContext();
const [showInlinePlaceholder, setShowInlinePlaceholder] = useState(false);

useEffect(() => {
  return editor.registerUpdateListener(({ editorState: state }) => {
    state.read(() => {
      const selection = $getSelection();
      if (
        $isRangeSelection(selection) &&
        selection.isCollapsed() &&
        selection.anchor.offset === 0
      ) {
        const node = selection.anchor.getNode();
        const parent = node.getParent();
        const isTopLevelNodeAndEmpty =
          $isRootOrShadowRoot(parent) && node.getTextContentSize() === 0;
        const isShowingTopLevelPlaceholder = $canShowPlaceholder(
          editor.isComposing()
        );

        if (
          isTopLevelNodeAndEmpty &&
          $isParagraphNode(node) &&
          !isShowingTopLevelPlaceholder
        ) {
          const range = createDOMRange(
            editor,
            selection.anchor.getNode(),
            selection.anchor.offset,
            selection.focus.getNode(),
            selection.focus.offset
          );

          if (range) {
            const DOMRect = range?.getBoundingClientRect();
            setShowInlinePlaceholder(true);
            // This function is my implementation, but the idea is to use the DOMRect to
            // position the floating element with the correct placeholder content
            // positionFloatingElement(DOMRect, floatingRef.current!);
            return;
          }
        }
      }

      setShowInlinePlaceholder(false);
    });
  });
}, [editor, floatingRef, positionFloatingElement]);
