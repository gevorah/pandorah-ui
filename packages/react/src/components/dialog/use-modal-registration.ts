import { useEffectEvent, useLayoutEffect, useRef } from 'react';

import { openModal, type OpenModal } from './modality';

export function useModalRegistration(
  popup: HTMLElement | null,
  getOpeners: () => Element[],
  onIsolationFailure: () => void,
) {
  const modalRef = useRef<OpenModal>(null);
  const readOpeners = useEffectEvent(getOpeners);
  const failIsolation = useEffectEvent(onIsolationFailure);

  useLayoutEffect(() => {
    if (!popup) return;
    if (modalRef.current) modalRef.current.replacePopup(popup);
    else {
      modalRef.current = openModal({
        popup,
        openers: readOpeners(),
        onIsolationFailure: () => failIsolation(),
      });
    }
  }, [popup]);

  useLayoutEffect(
    () => () => {
      modalRef.current?.close();
      modalRef.current = null;
    },
    [],
  );
}
