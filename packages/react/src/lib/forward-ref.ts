import { forwardRef, type ForwardRefRenderFunction } from 'react';

import type {
  As,
  PolymorphicComponent,
  PolymorphicProps
} from '../types/polymorphic';

export function polymorphicForwardRef<C extends As, Props = {}>(
  render: ForwardRefRenderFunction<Element, PolymorphicProps<C, Props>>
) {
  return forwardRef(render) as PolymorphicComponent<C, Props>;
}

