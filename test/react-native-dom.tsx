// The phone's primitives, drawn as browser elements, for the checks only — the app itself always
// imports 'react-native' and on a phone that is React Native's own. Nothing here is shipped.
import { createElement, type ReactNode } from 'react';

type Style = Record<string, unknown> | null | undefined | false | Style[];

type Props = {
  children?: ReactNode;
  style?: Style;
  accessibilityRole?: string;
  // Anything else a screen passes through to the element, untouched.
  [key: string]: unknown;
};

/** React Native allows an array of styles, and a browser does not: flattened, last word winning. */
function flatten(style: Style): Record<string, unknown> {
  if (!style) return {};
  if (Array.isArray(style)) return style.reduce<Record<string, unknown>>((all, one) => ({ ...all, ...flatten(one) }), {});
  return style as Record<string, unknown>;
}

function element(tag: string, base: Record<string, unknown>) {
  return function Primitive({ children, style, accessibilityRole, ...rest }: Props) {
    return createElement(
      tag,
      { style: { ...base, ...flatten(style) }, role: accessibilityRole, ...rest },
      children,
    );
  };
}

// display:flex, column, in that order, is React Native's own default for a View.
export const View = element('div', { display: 'flex', flexDirection: 'column', alignItems: 'stretch' });
export const Text = element('span', { display: 'block' });
