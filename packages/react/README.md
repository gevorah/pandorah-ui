# @pandorah-ui/react

Reusable React 19 components built with React Aria Components and CSS Modules.

Developed as a workspace package and designed to be copied into other projects.

## Development

Apps in this monorepo consume the source directly, without a separate build step.

```tsx
import '@pandorah-ui/react/styles.css';

import { Button } from '@pandorah-ui/react';
```

Vite and Storybook handle compilation and HMR.

## Reusing components

1. Copy the desired component directory from `src/components/`.
2. Copy `src/styles/tokens.css` and import it once.
3. Install `react-aria-components` in the consuming project.

## Styling

Components use CSS Modules and semantic design tokens. Themes can be customized through CSS custom properties.
