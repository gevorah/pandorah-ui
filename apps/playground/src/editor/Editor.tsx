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

import styles from './Editor.module.css';
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
      image: styles.image
    },
    editorState: null
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={
          <div>
            <ContentEditable className={styles.contentEditable} />
          </div>
        }
        placeholder={<div className={styles.placeholder}></div>}
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

