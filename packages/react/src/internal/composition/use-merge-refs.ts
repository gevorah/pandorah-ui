import { useMemo, type Ref, type RefCallback } from 'react';

import { mergeRefs } from './merge-refs';

export function useMergeRefs<T>(
  ...refs: (Ref<T> | undefined)[]
): RefCallback<T> {
  // eslint-disable-next-line react-hooks/use-memo, react-hooks/exhaustive-deps
  return useMemo(() => mergeRefs(...refs), refs);
}
