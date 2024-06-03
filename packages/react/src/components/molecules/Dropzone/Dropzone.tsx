import { type ChangeEventHandler } from 'react';
import { useDropzone, type DropzoneOptions } from 'react-dropzone';

import { cn } from '@/lib/utils';
import { Button } from '@/components/atoms/Button';

type DropzoneProps = DropzoneOptions & {
  onChange?: ChangeEventHandler<HTMLInputElement>;
};

export function Dropzone(props: DropzoneProps) {
  const {
    onChange,
    multiple = false,
    accept = { 'image/*': ['.png', '.jpeg', '.jpg'] },
    ...rest
  } = props;

  const { open, getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple,
    accept,
    ...rest
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex min-h-32 min-w-36 flex-col items-center justify-center rounded-lg',
        'border border-dashed border-black border-opacity-10 bg-white hover:border-opacity-30',
        {
          'border-opacity-30 bg-gray-100': isDragActive
        }
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        className="h-9 w-9"
      >
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M11.5 3h-7A1.5 1.5 0 0 0 3 4.5v5.027l.962-.7a1.75 1.75 0 0 1 2.079.016l.928.696l2.368-2.03a1.75 1.75 0 0 1 2.325.043L13 8.787V4.5A1.5 1.5 0 0 0 11.5 3m3 7.498V4.5a3 3 0 0 0-3-3h-7a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h7a3 3 0 0 0 3-3zm-1.5.33l-2.355-2.174a.25.25 0 0 0-.332-.006L7.488 11.07l-.457.392l-.481-.361l-1.41-1.057a.25.25 0 0 0-.296-.002L3 11.381v.119A1.5 1.5 0 0 0 4.5 13h7a1.5 1.5 0 0 0 1.5-1.5zM7.5 6a1.5 1.5 0 1 1-3 0a1.5 1.5 0 0 1 3 0"
          clipRule="evenodd"
        ></path>
      </svg>
      <Button
        type="button"
        onClick={open}
        variant="solid"
        className="mt-2 text-sm"
      >
        Browse
      </Button>
      <span className="mt-1 text-sm">or drag a file here</span>
      <input {...getInputProps()} onChange={onChange} />
    </div>
  );
}

