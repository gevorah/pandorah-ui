import type { ElementType, ReactElement } from 'react';

import type { DistributiveOmit, PropsOf } from './helper';

export type As = ElementType;

export type PolymorphicProps<Component extends As, Props = {}> = Props &
  DistributiveOmit<PropsOf<Component>, 'as' | keyof Props> & { as?: As };

export type PolymorphicComponent<Component extends As, Props = {}> = {
  <AsComponent extends As = Component>(
    props: PolymorphicProps<AsComponent, Props> & { as?: AsComponent }
  ): ReactElement | null;
  propTypes?: any;
  displayName?: string;
};

