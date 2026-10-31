import { Button, type ButtonProps } from '@pandorah-ui/react';

import styles from '../styles/button.module.css';

interface ButtonAppearance {
  variant?: 'solid' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export function StyledButton({
  variant = 'solid',
  size = 'md',
  className,
  ...props
}: ButtonProps & ButtonAppearance) {
  return (
    <Button
      {...props}
      className={className ? `${styles.button} ${className}` : styles.button}
      data-variant={variant}
      data-size={size}
    />
  );
}
