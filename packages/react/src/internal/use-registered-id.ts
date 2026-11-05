import { useId, useLayoutEffect, useRef, type Ref } from 'react';

import { useMergeRefs } from './composition/use-merge-refs';

export function useRegisteredId<T extends HTMLElement>(
  id: string | undefined,
  ref: Ref<T> | undefined,
  register: (id: string | undefined) => void,
) {
  const generatedId = useId();
  const elementRef = useRef<T>(null);
  useLayoutEffect(() => {
    register(elementRef.current?.id || undefined);
  });
  useLayoutEffect(() => () => register(undefined), [register]);
  return { id: id ?? generatedId, ref: useMergeRefs(ref, elementRef) };
}
