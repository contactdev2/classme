// The version of this app, read from the one place the build takes it from.
//
// app.json's own `expo.version` is what Expo installs on the phone: it becomes the Android
// versionName a teacher reads in their phone's app list, and `runtimeVersion.policy: appVersion`
// ties each update to it as well. Reading it here, rather than keeping a second copy of the
// number, is what makes the version on the welcome screen the installed app's version and not a
// line somebody has to remember to edit.
import appConfig from '../app.json';

/** The installed app's version: MAJOR.MINOR.PATCH. */
export function appVersion(): string {
  return appConfig.expo.version;
}

/** The version as a person reads it on a screen: a v, then the three numbers. */
export function versionLabel(): string {
  return `v${appVersion()}`;
}
