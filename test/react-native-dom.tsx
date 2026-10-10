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

/** #1E2A3A at a tenth, as a browser says it, so a shadow is drawn and not merely declared. */
function rgba(hex: string, opacity: number): string {
  const n = hex.replace('#', '');
  const full = n.length === 3 ? n.split('').map((c) => c + c).join('') : n;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) || 0);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/** React Native's four shadow words, said as the one word a browser draws (react-native-web's own). */
function asBoxShadow(drawn: Record<string, unknown>): void {
  const colour = drawn.shadowColor as string | undefined;
  const radius = (drawn.shadowRadius as number | undefined) ?? 0;
  const offset = (drawn.shadowOffset as { width?: number; height?: number } | undefined) ?? {};
  const opacity = (drawn.shadowOpacity as number | undefined) ?? 1;
  for (const word of ['shadowColor', 'shadowRadius', 'shadowOffset', 'shadowOpacity', 'elevation']) delete drawn[word];
  if (!colour) return;
  drawn.boxShadow = `${offset.width ?? 0}px ${offset.height ?? 0}px ${radius}px ${rgba(colour, opacity)}`;
}

/** React Native allows an array of styles, and a browser does not: flattened, last word winning. */
function flatten(style: Style): Record<string, unknown> {
  if (!style) return {};
  if (Array.isArray(style)) return style.reduce<Record<string, unknown>>((all, one) => ({ ...all, ...flatten(one) }), {});
  const drawn: Record<string, unknown> = {};
  for (const [word, value] of Object.entries(style as Record<string, unknown>)) {
    for (const said of expansions[word] ?? [word]) drawn[said] = value;
  }
  asBoxShadow(drawn);
  // React Native draws a solid border from a width alone; a browser left to itself draws no border
  // at all, and on the sides nobody asked about draws three black pixels. Said side by side, so a
  // hairline across the top stays a hairline across the top.
  if (!drawn.borderStyle) {
    for (const word of Object.keys(drawn)) {
      const side = /^border(|Top|Right|Bottom|Left)Width$/.exec(word);
      if (side) drawn[`border${side[1]}Style`] = 'solid';
    }
  }
  return drawn;
}

// React Native's own role names, said the way a browser says them (react-native-web's mapping).
const roles: Record<string, string> = { header: 'heading', link: 'link', button: 'button', image: 'img', text: 'none' };

const role = (accessibilityRole?: string) => (accessibilityRole ? roles[accessibilityRole] ?? accessibilityRole : undefined);

function element(tag: string, base: Record<string, unknown>) {
  return function Primitive({ children, style, accessibilityRole, ...rest }: Props) {
    return createElement(
      tag,
      {
        style: { ...base, ...flatten(style) },
        role: role(accessibilityRole),
        ...rest,
      },
      children,
    );
  };
}

// display:flex, column, in that order, is React Native's own default for a View.
export const View = element('div', { display: 'flex', flexDirection: 'column', alignItems: 'stretch' });
export const Text = element('span', { display: 'block' });

/** A place to type. The phone's keyboard and its hidden-text field, said as a browser's input. */
export function TextInput({
  style,
  secureTextEntry,
  keyboardType,
  accessibilityLabel,
  value,
  onChangeText,
  placeholder,
  // React Native's own words for a keyboard's manners: a browser has no use for them.
  autoCapitalize: _autoCapitalize,
  autoCorrect: _autoCorrect,
  autoComplete: _autoComplete,
  textContentType: _textContentType,
  placeholderTextColor,
  returnKeyType: _returnKeyType,
  onSubmitEditing: _onSubmitEditing,
  ...rest
}: Props & {
  secureTextEntry?: boolean;
  keyboardType?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
}) {
  const drawn = flatten(style);
  return createElement('input', {
    type: secureTextEntry ? 'password' : keyboardType === 'email-address' ? 'email' : 'text',
    'aria-label': accessibilityLabel,
    placeholder,
    value: value ?? '',
    onChange: (e: { target: { value: string } }) => onChangeText?.(e.target.value),
    style: { border: 'none', background: 'transparent', outline: 'none', color: 'inherit', font: 'inherit', ...drawn },
    // The placeholder's own colour, which a browser takes as a variable and React Native as a prop.
    ...(placeholderTextColor ? { 'data-placeholder-color': placeholderTextColor } : {}),
    ...rest,
  });
}

/** Something to press. What it does on a phone is a press; in a browser it is a click. */
export function Pressable({
  children,
  style,
  accessibilityRole,
  accessibilityLabel,
  accessibilityState,
  onPress,
  onPressIn: _onPressIn,
  onPressOut: _onPressOut,
  disabled,
  ...rest
}: Props & {
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityState?: { checked?: boolean; disabled?: boolean };
  disabled?: boolean;
}) {
  const given = typeof style === 'function' ? (style as (s: { pressed: boolean }) => Style)({ pressed: false }) : style;
  return createElement(
    'div',
    {
      style: { display: 'flex', flexDirection: 'column', alignItems: 'stretch', cursor: 'pointer', ...flatten(given) },
      role: role(accessibilityRole),
      'aria-label': accessibilityLabel,
      ...(accessibilityState?.checked === undefined ? {} : { 'aria-checked': accessibilityState.checked }),
      ...(disabled ? { 'aria-disabled': true } : {}),
      // A disabled Pressable does not answer a press on a phone, so it does not answer a click here.
      onClick: disabled ? undefined : onPress,
      ...rest,
    },
    typeof children === 'function' ? (children as (s: { pressed: boolean }) => ReactNode)({ pressed: false }) : children,
  );
}

/** A screen taller than the phone: on a browser, the same thing a browser already does. */
export function ScrollView({ children, style, contentContainerStyle, ...rest }: Props & { contentContainerStyle?: Style }) {
  return createElement(
    'div',
    { style: { display: 'flex', flexDirection: 'column', overflowY: 'auto', ...flatten(style) }, ...rest },
    createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'stretch', ...flatten(contentContainerStyle) } }, children),
  );
}
