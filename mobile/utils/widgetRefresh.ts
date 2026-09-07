/**
 * Utility to request a widget refresh from anywhere in the app.
 * Safe-wrapped so it silently no-ops in Expo Go.
 */
import Constants from 'expo-constants';

let requestWidgetUpdateFn: ((opts: { widgetName: string }) => Promise<void>) | null = null;

if (Constants.appOwnership !== 'expo') {
  try {
    const mod = require('react-native-android-widget');
    requestWidgetUpdateFn = mod.requestWidgetUpdate;
  } catch (e) {
    // not available on iOS or if build failed
  }
}

export async function refreshWidget() {
  try {
    if (requestWidgetUpdateFn) {
      await requestWidgetUpdateFn({ widgetName: 'AttendMeWidget' });
    }
  } catch (e) {
    // silently ignore — widget not placed or unavailable
  }
}
