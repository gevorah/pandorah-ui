import {
  forwardRef,
  type ForwardRefRenderFunction,
  type PropsWithoutRef
} from 'react';

import type {
  As,
  PolymorphicComponent,
  PolymorphicProps
} from '../types/polymorphic';

export function polymorphicForwardRef<Component extends As, Props = {}>(
  render: ForwardRefRenderFunction<
    any,
    PropsWithoutRef<PolymorphicProps<Component, Props>>
  >
) {
  return forwardRef(render) as PolymorphicComponent<Component, Props>;
}
