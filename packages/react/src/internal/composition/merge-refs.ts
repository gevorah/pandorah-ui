import type { Ref, RefCallback } from 'react';

export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return (instance) => {
    const cleanups = refs.map((ref) => attach(ref, instance));

    return () => {
      for (const cleanup of cleanups) cleanup?.();
    };
  };
}

function attach<T>(ref: Ref<T> | undefined, instance: T) {
  if (typeof ref === 'function') {
    const cleanup = ref(instance);
    return typeof cleanup === 'function' ? cleanup : () => ref(null);
  }
  if (ref) {
    ref.current = instance;
    return () => {
      ref.current = null;
    };
  }
  return undefined;
}
