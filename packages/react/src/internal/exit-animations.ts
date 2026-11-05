export function exitAnimationsFinished(elements: (HTMLElement | null)[]) {
  const animations = elements
    .flatMap((element) => element?.getAnimations({ subtree: true }) ?? [])
    .filter((animation) => {
      const effect = animation.effect as KeyframeEffect | null;
      return (
        elements.includes(effect?.target as HTMLElement | null) &&
        effect?.getComputedTiming().endTime !== Infinity
      );
    });
  return Promise.allSettled(animations.map((animation) => animation.finished));
}
