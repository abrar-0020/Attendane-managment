/**
 * Safe haptics utility — silently no-ops if the native module is unavailable
 * (e.g. Expo Go). Works correctly in production / development builds.
 */
import * as Haptics from 'expo-haptics';

const safe = (fn: () => Promise<void>) => {
  fn().catch(() => {/* unavailable in Expo Go, ignore */});
};

export const haptics = {
  /** Light tick — navigation, selection changes */
  selection: () => safe(() => Haptics.selectionAsync()),

  /** Quick light tap — minor confirmations */
  light: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),

  /** Solid medium thud — marking absent, deliberate actions */
  medium: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),

  /** Heavy thunk — strong confirmations */
  heavy: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),

  /** ✅ Success triple-bump — marking present, saving */
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),

  /** ⚠️ Warning buzz — destructive actions like "Clear all" */
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),

  /** ❌ Error — failed operations */
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
