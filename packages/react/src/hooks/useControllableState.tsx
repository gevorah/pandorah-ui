import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction
} from 'react';

import { useCallbackRef } from './useCallbackRef';

type UseControllableStateOptions<T> = {
  value?: T;
  defaultValue: T;
  onChange?: (value: T) => void;
};

export function useControllableState<T>(
  options: UseControllableStateOptions<T>
): [T, Dispatch<SetStateAction<T>>] {
  const { value: controlledValue, defaultValue, onChange } = options;

  const [uncontrolledValue, setUncontrolledValue] = useState<T>(defaultValue);
  const isControlled = controlledValue !== undefined;
  const handleChange = useCallbackRef(onChange);

  const value = isControlled ? controlledValue : uncontrolledValue;

  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (next) => {
      const setter = next as (prev?: T) => T;
      const nextValue =
        typeof next === 'function' ? setter(controlledValue) : next;

      if (value === nextValue) return;

      if (!isControlled) {
        setUncontrolledValue(nextValue);
      }
      handleChange(nextValue);
    },
    [isControlled, value, handleChange, setUncontrolledValue]
  );

  return [value, setValue];
}

