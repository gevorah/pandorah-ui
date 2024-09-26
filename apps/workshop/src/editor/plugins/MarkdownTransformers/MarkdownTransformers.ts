import { CHECK_LIST, TRANSFORMERS, type Transformer } from '@lexical/markdown';

export const MARKDOWN_TRANSFORMERS: Array<Transformer> = [
  ...TRANSFORMERS,
  CHECK_LIST
];

