import {
  LexicalComposer,
  type InitialConfigType
} from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';

import { NodesKit } from './nodes/nodes-kit';
import { ImagePlugin } from './plugins/ImagePlugin';
import { ImageToolbarPlugin } from './plugins/ImageToolbarPlugin';
import { MARKDOWN_TRANSFORMERS } from './plugins/MarkdownTransformers';
import { SlashCommandPlugin } from './plugins/SlashCommandPlugin';

export const Editor = () => {
  const initialConfig: InitialConfigType = {
    namespace: 'editor',
    nodes: NodesKit,
    onError: (error) => console.log(error),
    editable: true,
    theme: {
      image: 'relative block'
    },
    editorState: null
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={
          <div>
            <ContentEditable className="min-h-96 rounded-md border border-neutral-800 px-8 py-4 outline-none" />
          </div>
        }
        placeholder={<div className="absolute left-8 top-4 opacity-60"></div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      <MarkdownShortcutPlugin transformers={MARKDOWN_TRANSFORMERS} />
      <HorizontalRulePlugin />

      <SlashCommandPlugin />
      <ImagePlugin />
      <ImageToolbarPlugin />
    </LexicalComposer>
  );
};

