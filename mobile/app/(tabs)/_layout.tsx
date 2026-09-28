import { TopTabs as SwipeTabs } from 'expo-router/js-top-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { useThemeContext } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { theme } = useThemeContext();
  const insets = useSafeAreaInsets();

  return (
    <SwipeTabs
      tabBarPosition="bottom"
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        swipeEnabled: true,
        tabBarIndicatorStyle: {
          height: 0, // Hide the indicator line to mimic bottom tabs
        },
        tabBarStyle: {
          backgroundColor: theme.colors.surfaceContainerLowest,
          borderTopWidth: 1,
          borderTopColor: theme.colors.surfaceContainerHigh,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 16,
          height: 70 + insets.bottom,
          paddingBottom: 12 + insets.bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: 'Manrope-Medium',
          fontSize: 11,
          marginTop: 4,
          textTransform: 'none',
        },
      }}>
      <SwipeTabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }: { color: string }) => <MaterialIcons name="home" size={26} color={color} />,
        }}
      />
      <SwipeTabs.Screen
        name="stats"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color }: { color: string }) => <MaterialIcons name="bar-chart" size={26} color={color} />,
        }}
      />
      <SwipeTabs.Screen
        name="calendar"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color }: { color: string }) => <MaterialIcons name="calendar-today" size={26} color={color} />,
        }}
      />
      <SwipeTabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }: { color: string }) => <MaterialIcons name="settings" size={26} color={color} />,
        }}
      />
    </SwipeTabs>
  );
}

const styles = StyleSheet.create({
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  }
});
