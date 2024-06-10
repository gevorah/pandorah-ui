import type {
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  ElementType,
  JSXElementConstructor
} from 'react';

import type { DistributiveOmit, PropsOf } from './helper';

export type As = ElementType;

export type PolymorphicProps<Component extends As, Props = {}> = Props &
  DistributiveOmit<PropsOf<Component>, 'as' | keyof Props> & {
    as?: Component;
  };

export type PolymorphicComponent<Component extends As, Props = {}> = {
  <AsComponent extends As = Component>(
    props: PolymorphicProps<AsComponent, Props>
  ): JSX.Element;
  displayName?: string;
  propTypes?: any;
};

