import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from '@/constants/theme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surfaceContainer,
          borderTopWidth: 0,
          elevation: 0, // Remove shadow on Android
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontFamily: 'sans-serif-medium', // Match Manrope roughly for now
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color }) => <MaterialIcons name="home" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          headerShown: false,
          tabBarIcon: ({ color }) => <MaterialIcons name="bar-chart" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          headerShown: false,
          tabBarIcon: ({ color }) => <MaterialIcons name="calendar-today" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerShown: false,
          tabBarIcon: ({ color }) => <MaterialIcons name="settings" size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}
