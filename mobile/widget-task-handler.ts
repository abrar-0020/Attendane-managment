/**
 * Widget entry point — registered as a headless task.
 * Android calls this file when the widget needs updating.
 * Must be at the root level (same dir as index.js / expo entry).
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';

if (Platform.OS === 'android' && Constants.appOwnership !== 'expo') {
  try {
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    const { widgetTaskHandler } = require('./widgets/widgetTaskHandler');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch (e) {
    console.warn('Could not register widget task handler', e);
  }
}
