export function isUnavailable(element: Element) {
  return (
    element.matches(':disabled') ||
    element.getAttribute('aria-disabled') === 'true'
  );
}
