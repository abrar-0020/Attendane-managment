import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Text } from '@/components/Text';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../../context/ThemeContext';

export default function AboutApp() {
  const router = useRouter();
  const { theme, isDark } = useThemeContext();
  const styles = makeStyles(theme, isDark);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.appTitle}>About App</Text>
        <View style={{ width: 48 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoSection}>
          <View style={[styles.iconBox, { backgroundColor: theme.colors.primary }]}>
             <MaterialIcons name="school" size={48} color="white" />
          </View>
          <Text style={styles.appName}>AttendMe</Text>
          <Text style={styles.versionText}>Version 2.0.0</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.paragraph}>
            AttendMe is a modern, student-first attendance manager built to make tracking your classes seamless and intuitive.
          </Text>
          <Text style={styles.paragraph}>
            By automating your attendance tracking with intelligent integration to college portals, AttendMe ensures you never have to guess your attendance status again. We prioritize a clean, professional user experience that focuses heavily on privacy, speed, and accuracy.
          </Text>
        </View>

        <View style={styles.footerSection}>
          <Text style={styles.footerText}>
            Designed with ❤️ for students.
          </Text>
          <Text style={styles.footerTextSmall}>
            © 2026 AttendMe Inc. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? theme.colors.background : '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  iconBtn: {
    padding: 12,
  },
  appTitle: {
    fontSize: 16,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.onSurface,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  versionText: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: '#6B7280',
  },
  section: {
    marginBottom: 32,
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDark ? theme.colors.outlineVariant : '#F3F4F6',
  },
  paragraph: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.onSurfaceVariant,
    lineHeight: 24,
    marginBottom: 16,
  },
  footerSection: {
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  footerTextSmall: {
    fontSize: 12,
    fontFamily: 'Manrope-Regular',
    color: '#9CA3AF',
  }
});
