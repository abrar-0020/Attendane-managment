import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import { Text } from '@/components/Text';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../../context/ThemeContext';

export default function PrivacyPolicy() {
  const router = useRouter();
  const { theme } = useThemeContext();
  const styles = makeStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.appTitle}>Privacy Policy</Text>
        <View style={{ width: 48 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Data Storage & Security</Text>
          <Text style={styles.paragraph}>
            Your privacy and security are our top priorities. All of your personal data, including your Linways credentials, are stored <Text style={styles.boldText}>locally and securely on your device</Text> using encrypted storage mechanisms.
          </Text>
          <Text style={styles.paragraph}>
            We do <Text style={styles.boldText}>not</Text> upload, share, or transmit your passwords to any external servers, third-party databases, or analytics services. The app only communicates directly with the official college portals to fetch your attendance data.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. App Data</Text>
          <Text style={styles.paragraph}>
            Your timetable, attendance records, and personal preferences are completely yours. They are saved directly to your phone's local storage and are never uploaded to the cloud. You can delete all your data at any time by uninstalling the app or using the "Clear All Data" option in settings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Transparency</Text>
          <Text style={styles.paragraph}>
            Because this application operates entirely on your device, it requires no internet connection to view your saved timetable or local records. Internet access is solely used during synchronization to fetch updates directly from your college portal.
          </Text>
        </View>

        <View style={styles.footerSection}>
          <MaterialIcons name="verified-user" size={48} color={theme.colors.primary} style={styles.footerIcon} />
          <Text style={styles.footerText}>
            Built with trust. Your data belongs to you.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceContainer,
    backgroundColor: theme.colors.surface,
  },
  iconBtn: {
    padding: 12,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
    backgroundColor: theme.colors.surfaceContainerLowest,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: 12,
  },
  boldText: {
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  footerSection: {
    alignItems: 'center',
    marginTop: 32,
    paddingHorizontal: 20,
  },
  footerIcon: {
    marginBottom: 16,
    opacity: 0.8,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  }
});
