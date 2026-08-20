import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, SafeAreaView, Switch, Alert, ActivityIndicator } from 'react-native';
import { Text } from '@/components/Text';
import { MaterialIcons } from '@expo/vector-icons';
import { linwaysSync } from '../../services/linwaysSync';
import { storage } from '../../services/storage';
import { useThemeContext } from '../../context/ThemeContext';
import { Stack, useRouter } from 'expo-router';

export default function LinwaysSyncModal() {
  const { theme, isDark, toggleTheme } = useThemeContext();
  const styles = makeStyles(theme);

  const router = useRouter();
  const [step, setStep] = useState<'form' | 'syncing' | 'success'>('form');

  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [autoSync, setAutoSync] = useState(true);

  // Result state
  const [importedCount, setImportedCount] = useState(0);
  const [lastSynced, setLastSynced] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const cfg = await linwaysSync.getConfig();
    if (cfg) {
      setUsername(cfg.username || '');
      setPassword(cfg.password || '');
      setAutoSync(cfg.autoSync !== false);
    }
    const label = await linwaysSync.getLastSyncedLabel();
    if (label) setLastSynced(label);
  };

  const handleSave = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Error", 'Please fill in both fields.');
      return;
    }

    const startDate = await storage.getStartDate();
    const config = {
      username: username.trim(),
      password: password.trim(),
      autoSync,
      fromDate: startDate || '2025-01-01',
    };

    await linwaysSync.saveConfig(config);
    await runSync();
  };

  const runSync = async () => {
    setStep('syncing');
    try {
      const result = await linwaysSync.sync();
      if (result.success) {
        setImportedCount(result.imported || 0);
        setLastSynced('Just now');
        setStep('success');
      } else {
        Alert.alert("Sync Failed", result.error || 'Unknown error.');
        setStep('form');
      }
    } catch (e: any) {
      Alert.alert("Sync Error", e.message || "An unexpected error occurred");
      setStep('form');
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      "Remove Credentials",
      "Remove Linways sync credentials from this device?",
      [
         { text: "Cancel", style: "cancel" },
         { text: "Remove", style: "destructive", onPress: async () => {
            await linwaysSync.clearConfig();
            router.back();
         }}
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Linways Sync',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{marginLeft: 0}}>
               <MaterialIcons name="close" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
          ),
        }} 
      />

      {(step === 'form') && (
        <ScrollView style={styles.scrollContent}>
          <View style={styles.heroWrap}>
            <MaterialIcons name="sync-lock" size={48} color={theme.colors.primary} />
            <Text style={styles.title}>Auto-Sync Attendance</Text>
            <Text style={styles.subtitle}>
              Enter your Presidency University portal credentials. AttendMe will fetch
              your daily attendance automatically every time the app opens.
            </Text>
          </View>

          {lastSynced ? (
            <View style={styles.lastSynced}>
              <MaterialIcons name="schedule" size={16} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.lastSyncedText}>Last synced: {lastSynced}</Text>
            </View>
          ) : null}

          <View style={styles.formGroup}>
            <Text style={styles.label}>University Username</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 20241XYZ0001"
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
              placeholderTextColor={theme.colors.outlineVariant}
            />

            <Text style={styles.label}>Portal Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Your Linways password"
                secureTextEntry={true}
                value={password}
                onChangeText={setPassword}
                placeholderTextColor={theme.colors.outlineVariant}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <MaterialIcons name="autorenew" size={24} color={theme.colors.primary} />
                <View style={styles.toggleTexts}>
                  <Text style={styles.toggleTitle}>Auto-sync on app open</Text>
                  <Text style={styles.toggleSub}>Fetches latest attendance silently</Text>
                </View>
              </View>
              <Switch 
                value={autoSync} 
                onValueChange={setAutoSync} 
                trackColor={{ true: theme.colors.primary }}
              />
            </View>

            <View style={styles.securityNote}>
              <MaterialIcons name="lock" size={16} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.securityText}>
                Credentials are stored only on this device. All requests go directly
                to the official Linways portal — no third-party servers involved.
              </Text>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
              <Text style={styles.primaryBtnText}>Save & Sync Now</Text>
            </TouchableOpacity>

            {!!username && (
              <TouchableOpacity style={styles.dangerBtn} onPress={handleDisconnect}>
                <Text style={styles.dangerBtnText}>Remove Saved Credentials</Text>
              </TouchableOpacity>
            )}
            
            <View style={{height: 40}}/>
          </View>
        </ScrollView>
      )}

      {step === 'syncing' && (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.syncingTitle}>Syncing from Linways...</Text>
          <Text style={styles.syncingSub}>Logging in and fetching your attendance records. This takes just a moment.</Text>
        </View>
      )}

      {step === 'success' && (
        <View style={styles.centerWrap}>
          <View style={styles.successIconWrap}>
             <MaterialIcons name="check-circle" size={64} color={theme.colors.primary} />
          </View>
          <Text style={styles.successTitle}>Sync complete!</Text>
          <Text style={styles.successSub}>
            {importedCount > 0
              ? `${importedCount} attendance records were imported and your stats are now up to date.`
              : 'Your attendance is already up to date. No new records were found.'}
          </Text>
          
          <TouchableOpacity style={[styles.primaryBtn, {width: '100%', marginTop: 32}]} onPress={() => router.back()}>
             <Text style={styles.primaryBtnText}>Done</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.textBtn} onPress={() => setStep('form')}>
             <Text style={styles.textBtnText}>Edit credentials</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 24,
  },
  heroWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  lastSynced: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.surfaceContainer,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 24,
  },
  lastSyncedText: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
  },
  formGroup: {
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.surfaceContainer,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  passwordRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceContainer,
    borderRadius: 8,
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  eyeBtn: {
    padding: 12,
  },
  hint: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    backgroundColor: theme.colors.surfaceContainerLowest,
    padding: 16,
    borderRadius: 12,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleTexts: {
    marginLeft: 12,
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  toggleSub: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  securityNote: {
    flexDirection: 'row',
    marginTop: 24,
    padding: 16,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 12,
    gap: 12,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 18,
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  primaryBtnText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  dangerBtn: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  dangerBtnText: {
    color: theme.colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  syncingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: 24,
    marginBottom: 8,
  },
  syncingSub: {
    fontSize: 15,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
  successIconWrap: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginBottom: 12,
  },
  successSub: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
  },
  textBtn: {
    padding: 16,
    marginTop: 8,
  },
  textBtnText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  }
});
