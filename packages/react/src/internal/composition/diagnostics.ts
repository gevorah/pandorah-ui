import { useEffect, useRef } from 'react';

declare const process: { env: { NODE_ENV?: string } };

export const isDevelopment = process.env.NODE_ENV !== 'production';

export function useDevelopmentDiagnostics(
  renderProblems: string[],
  checkElement: () => string | undefined,
) {
  const reported = useRef('');

  useEffect(() => {
    if (!isDevelopment) return;
    const elementProblem = checkElement();
    const problems = elementProblem
      ? [...renderProblems, elementProblem]
      : renderProblems;
    const summary = problems.join('\n');
    if (summary !== reported.current)
      problems.forEach((problem) => console.error(problem));
    reported.current = summary;
  });
}

export function findElementProblem(
  name: string,
  tag: string,
  ownedEntries: [string, unknown][],
  element: unknown,
) {
  if (!isElement(element)) {
    return `${name}: the render element did not attach the ref. It must render a component that passes \`ref\` and its props to a DOM element.`;
  }
  if (element.localName !== tag) {
    return `${name}: rendered <${element.localName}>, but it must render <${tag}>.`;
  }
  for (const [key, value] of ownedEntries) {
    if (value === undefined && element.hasAttribute(key)) {
      return `${name}: the render element added \`${key}\`, which the component leaves out.`;
    }
    if (value !== undefined && !reflects(element, key, value)) {
      return `${name}: the render element did not pass \`${key}\` to its DOM element.`;
    }
  }
  return undefined;
}

function isElement(value: unknown): value is Element {
  return (value as Node | null)?.nodeType === Node.ELEMENT_NODE;
}

function reflects(element: Element, key: string, value: unknown) {
  if (typeof value === 'boolean' && !/^(aria|data)-/.test(key)) {
    return element.hasAttribute(key) === value;
  }
  return element.getAttribute(key) === String(value);
}
