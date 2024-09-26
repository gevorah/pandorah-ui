import { forwardRef, type ComponentPropsWithoutRef } from 'react';

const imageCache = new Set();

const useSuspenseImage = (src: string) => {
  if (!imageCache.has(src)) {
    throw new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        imageCache.add(src);
        resolve(null);
      };
      img.onerror = () => {
        imageCache.add(src);
      };
    });
  }
};

export type LazyImageProps = { src: string } & ComponentPropsWithoutRef<'img'>;

export const LazyImage = forwardRef<HTMLImageElement, LazyImageProps>(
  (props, ref) => {
    const { src, alt, className, ...rest } = props;

    useSuspenseImage(src);

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        draggable="false"
        className={className}
        {...rest}
      />
    );
  }
);

