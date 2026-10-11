// The phone itself, told which way the app now reads.
//
// The screens mirror themselves — each one lays itself out in the direction the language asks for —
// and this tells the phone's own text layer the same thing, so a keyboard, an alert and a word
// wrapping mid-sentence are mirrored with them. Installed once, at the app's root.
import { I18nManager } from 'react-native';
import { direction, onLanguageChange } from './i18n';

function tellThePhone(): void {
  const rtl = direction() === 'rtl';
  try {
    I18nManager.allowRTL(true);
    if (I18nManager.isRTL !== rtl) I18nManager.forceRTL(rtl);
  } catch {
    // A phone that will not be told keeps the direction the screens already draw themselves in.
  }
}

/** Keeps the phone's own text direction with the language, for as long as the app runs. */
export function mirrorWithLanguage(): void {
  tellThePhone();
  onLanguageChange(tellThePhone);
}
