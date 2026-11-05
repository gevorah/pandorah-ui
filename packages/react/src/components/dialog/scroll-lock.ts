interface Lock {
  count: number;
  restore: () => void;
}

const locks = new WeakMap<Document, Lock>();

export function lockScroll(document: Document) {
  const existing = locks.get(document);
  if (existing) {
    existing.count++;
  } else {
    const html = document.documentElement;
    const { overflow, scrollbarGutter } = html.style;
    const hasClassicScrollbar =
      (document.defaultView?.innerWidth ?? 0) > html.clientWidth;
    html.style.overflow = 'hidden';
    if (hasClassicScrollbar) html.style.scrollbarGutter = 'stable';
    locks.set(document, {
      count: 1,
      restore() {
        html.style.overflow = overflow;
        html.style.scrollbarGutter = scrollbarGutter;
      },
    });
  }

  return () => {
    const lock = locks.get(document)!;
    if (--lock.count > 0) return;
    lock.restore();
    locks.delete(document);
  };
}
