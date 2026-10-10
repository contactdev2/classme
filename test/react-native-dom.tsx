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

// The style words React Native has and a browser does not, said as the pairs a browser draws
// (react-native-web's own expansion). Left unexpanded, a page is drawn without them and the
// picture would show a screen nobody would ever see on a phone.
const expansions: Record<string, string[]> = {
  paddingHorizontal: ['paddingLeft', 'paddingRight'],
  paddingVertical: ['paddingTop', 'paddingBottom'],
  marginHorizontal: ['marginLeft', 'marginRight'],
  marginVertical: ['marginTop', 'marginBottom'],
};

/** React Native allows an array of styles, and a browser does not: flattened, last word winning. */
function flatten(style: Style): Record<string, unknown> {
  if (!style) return {};
  if (Array.isArray(style)) return style.reduce<Record<string, unknown>>((all, one) => ({ ...all, ...flatten(one) }), {});
  const drawn: Record<string, unknown> = {};
  for (const [word, value] of Object.entries(style as Record<string, unknown>)) {
    for (const said of expansions[word] ?? [word]) drawn[said] = value;
  }
  return drawn;
}

// React Native's own role names, said the way a browser says them (react-native-web's mapping).
const roles: Record<string, string> = { header: 'heading', link: 'link', button: 'button', image: 'img', text: 'none' };

function element(tag: string, base: Record<string, unknown>) {
  return function Primitive({ children, style, accessibilityRole, ...rest }: Props) {
    return createElement(
      tag,
      {
        style: { ...base, ...flatten(style) },
        role: accessibilityRole ? roles[accessibilityRole] ?? accessibilityRole : undefined,
        ...rest,
      },
      children,
    );
  };
}

// display:flex, column, in that order, is React Native's own default for a View.
export const View = element('div', { display: 'flex', flexDirection: 'column', alignItems: 'stretch' });
export const Text = element('span', { display: 'block' });
