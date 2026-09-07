import React, { useState, useCallback } from 'react';
import { haptics } from '../../utils/haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Text } from '@/components/Text';
import { MaterialIcons } from '@expo/vector-icons';
import { storage } from '../../services/storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { useThemeContext } from '../../context/ThemeContext';
import { AnimatedFadeIn } from '../../components/AnimatedFadeIn';
import { LinearGradient } from '@/components/LinearGradient';

export default function SettingsView() {
  const router = useRouter();
  const { theme, isDark, toggleTheme } = useThemeContext();
  const styles = makeStyles(theme, isDark);
  
  const [profile, setProfile] = useState<any>({});
  const [notifPrefs, setNotifPrefs] = useState<any>({ notifications: true });

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const p = (await storage.getProfile()) || {};
    setProfile(p);
  };

  const handleToggleTheme = async (val: boolean) => {
    await haptics.selection();
    toggleTheme(val);
  };

  const clearAllData = () => {
    haptics.warning();
    Alert.alert(
      "Logout",
      "Are you sure you want to log out and clear all data?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive", 
          onPress: async () => {
            await storage.clearAll();
            loadData();
          }
        }
      ]
    );
  };

  const iconColor = isDark ? 'rgba(255,255,255,0.7)' : '#4b5563';
  const chevronColor = isDark ? 'rgba(255,255,255,0.3)' : '#9ca3af';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
      <AnimatedFadeIn delay={0}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back-ios" size={18} color={theme.colors.onSurface} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>
      </AnimatedFadeIn>
        
      <AnimatedFadeIn delay={50}>
        <LinearGradient
          colors={['#5c8072', '#517466']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileHero}
        >
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <MaterialIcons name="person-outline" size={26} color="white" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.name || 'Student'}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="white" />
          </View>
        </LinearGradient>
      </AnimatedFadeIn>

      <AnimatedFadeIn delay={100}>
        <View style={styles.settingsGroup}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          
          <View style={styles.cardGroup}>
            <TouchableOpacity style={styles.settingRow} onPress={() => { haptics.selection(); router.push('/settings-modals/linways-sync'); }}>
              <View style={styles.iconBox}>
                <MaterialIcons name="sync" size={20} color={iconColor} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Linways Auto-Sync</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={chevronColor} />
            </TouchableOpacity>
            
            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow} onPress={() => { haptics.selection(); router.push('/settings-modals/manage-classes'); }}>
              <View style={styles.iconBox}>
                <MaterialIcons name="class" size={20} color={iconColor} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Manage Timetable</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={chevronColor} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow} onPress={() => { haptics.selection(); router.push('/settings-modals/privacy-policy'); }}>
              <View style={styles.iconBox}>
                <MaterialIcons name="lock-outline" size={20} color={iconColor} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Privacy & Security</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={chevronColor} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.iconBox}>
                <MaterialIcons name="notifications-none" size={20} color={iconColor} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Notifications</Text>
              </View>
              <Switch 
                value={notifPrefs.notifications}
                onValueChange={(v) => setNotifPrefs({notifications: v})}
                trackColor={{ true: '#5a7d6f', false: isDark ? theme.colors.surfaceContainerHighest : '#e5e7eb' }}
                thumbColor="white"
                style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
              />
            </View>
          </View>
        </View>
      </AnimatedFadeIn>
      <AnimatedFadeIn delay={150}>
        <View style={styles.settingsGroup}>
          <Text style={styles.sectionTitle}>PREFERENCES</Text>
          
          <View style={styles.cardGroup}>
            
            <View style={styles.settingRow}>
              <View style={styles.iconBox}>
                <MaterialIcons name="dark-mode" size={20} color={iconColor} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Dark Mode</Text>
              </View>
              <Switch 
                value={isDark}
                onValueChange={handleToggleTheme}
                trackColor={{ true: '#5a7d6f', false: isDark ? theme.colors.surfaceContainerHighest : '#e5e7eb' }}
                thumbColor="white"
                style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
              />
            </View>
          </View>
        </View>
      </AnimatedFadeIn>
        
      <AnimatedFadeIn delay={200}>
        <View style={styles.settingsGroup}>
          <Text style={styles.sectionTitle}>SUPPORT</Text>
          
          <View style={styles.cardGroup}>
            
            <TouchableOpacity style={styles.settingRow} onPress={() => { haptics.selection(); router.push('/settings-modals/about-app'); }}>
              <View style={styles.iconBox}>
                <MaterialIcons name="info-outline" size={20} color={iconColor} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>About App</Text>
                <Text style={styles.settingDesc}>Version 2.0.0</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={chevronColor} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={clearAllData}>
          <MaterialIcons name="logout" size={20} color="#dc2626" />
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </AnimatedFadeIn>

      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? theme.colors.background : '#FAFAFA' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 100 },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  backBtn: { padding: 8, width: 40 },
  pageTitle: { fontSize: 18, fontFamily: 'Manrope-SemiBold', color: theme.colors.onSurface },
  
  profileHero: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 32,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontFamily: 'Manrope-SemiBold', color: 'white', marginBottom: 2 },
  profileRole: { fontSize: 12, fontFamily: 'Manrope-Medium', color: 'rgba(255,255,255,0.9)' },
  profileId: { fontSize: 11, fontFamily: 'Manrope-Regular', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  
  settingsGroup: {
    marginBottom: 28,
  },
  sectionTitle: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginLeft: 8 },
  
  cardGroup: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDark ? theme.colors.outlineVariant : '#F3F4F6',
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: isDark ? theme.colors.outlineVariant : '#F3F4F6', marginLeft: 64 },
  
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16 },
  iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? theme.colors.surfaceContainerHighest : '#F9FAFB' },
  settingText: { flex: 1, marginLeft: 16, marginRight: 12 },
  settingTitle: { fontSize: 14, fontFamily: 'Manrope-Medium', color: theme.colors.onSurface },
  settingDesc: { fontSize: 12, fontFamily: 'Manrope-Regular', color: '#6B7280', marginTop: 2 },
  
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: isDark ? 'rgba(220, 38, 38, 0.1)' : '#FEF2F2', paddingVertical: 16, borderRadius: 16, marginTop: 8 },
  logoutBtnText: { color: '#dc2626', fontSize: 15, fontFamily: 'Manrope-SemiBold' },
});
