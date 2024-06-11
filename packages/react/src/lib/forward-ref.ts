import { forwardRef, type ForwardRefRenderFunction } from 'react';

import type {
  As,
  PolymorphicComponent,
  PolymorphicProps
} from '../types/polymorphic';

export function polymorphicForwardRef<Component extends As, Props = {}>(
  render: ForwardRefRenderFunction<any, PolymorphicProps<Component, Props>>
) {
  return forwardRef(render) as PolymorphicComponent<Component, Props>;
}

